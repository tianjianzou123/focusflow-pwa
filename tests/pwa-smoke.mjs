import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const BASE_URL = process.env.PWA_BASE_URL || "http://127.0.0.1:4173";
const browserPaths = [
  process.env.PWA_BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/microsoft-edge",
  "/usr/bin/google-chrome",
].filter(Boolean);
const executablePath = browserPaths.find(existsSync);

assert(executablePath, "No compatible installed Chromium browser was found.");
mkdirSync(resolve("test-results"), { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const results = [];

function pass(name, detail = "") {
  results.push({ test: name, status: "PASS", detail });
}


try {
  const simulatedLocation = { latitude: 55.864237, longitude: -4.251806 };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "allow",
    geolocation: simulatedLocation,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(BASE_URL, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.equal(await page.title(), "FocusFlow Tasks");
  assert.equal(await page.getByRole("heading", { name: /Make space for/i }).isVisible(), true);
  pass("Production page loads", "HTTP 200, correct title and hero");

  const manifest = await page.evaluate(async () => (await fetch("./manifest.json")).json());
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, ".");
  assert(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert(manifest.icons.some((icon) => icon.purpose === "maskable"));
  pass("Manifest is valid at runtime", "standalone + 192/512/maskable icons");

  const originalTaskName = `Geolocation test ${Date.now()}`;
  const taskName = `${originalTaskName} updated`;
  const initialCount = await page.locator(".task-item").count();
  await page.getByLabel("What needs your attention?").fill(originalTaskName);
  await page.getByRole("button", { name: "Add task" }).click();
  let createdTask = page.locator(".task-item", { hasText: originalTaskName });
  await createdTask.waitFor();
  assert.equal(await page.locator(".task-item").count(), initialCount + 1);
  const location = createdTask.locator('[data-testid="task-location"]');
  await location.filter({ hasText: "55.864237" }).waitFor();
  assert.match(await location.innerText(), /\| la 55\.864237 \| lo -4\.251806/);
  const savedLocation = await page.evaluate((name) => {
    const task = JSON.parse(localStorage.getItem("tasks")).find((item) => item.name === name);
    return { id: task.id, location: task.location };
  }, originalTaskName);
  assert.match(savedLocation.id, /^todo-/);
  assert.deepEqual(savedLocation.location, {
    latitude: "55.864237",
    longitude: "-4.251806",
    error: "",
  });
  pass("Geolocation is attached to the new task", "simulated latitude/longitude saved with todo-nanoid ID");

  await page.getByRole("button", { name: `Edit ${originalTaskName}` }).click();
  await page.getByLabel(`New name for ${originalTaskName}`).fill(taskName);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  createdTask = page.locator(".task-item", { hasText: taskName });
  await createdTask.waitFor();
  await createdTask.locator(".task-main").click();
  assert.equal(await createdTask.locator('input[type="checkbox"]').isChecked(), true);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".task-item", { hasText: taskName }).getAttribute("class"), "task-item done");
  pass("Task workflow and persistence", "add, edit, complete and localStorage reload");

  await page.getByRole("button", { name: "completed", exact: true }).click();
  assert.equal(await page.locator(".task-item", { hasText: taskName }).isVisible(), true);
  await page.getByRole("button", { name: "active", exact: true }).click();
  assert.equal(await page.locator(".task-item", { hasText: taskName }).count(), 0);
  await page.getByRole("button", { name: "all", exact: true }).click();
  pass("Task filters", "all, active and completed");

  const serviceWorker = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolveController) => {
        navigator.serviceWorker.addEventListener("controllerchange", resolveController, { once: true });
        setTimeout(resolveController, 5000);
      });
    }
    return {
      supported: "serviceWorker" in navigator,
      activeState: registration.active?.state,
      controlled: Boolean(navigator.serviceWorker.controller),
      caches: await caches.keys(),
    };
  });
  assert.equal(serviceWorker.supported, true);
  assert.equal(serviceWorker.activeState, "activated");
  assert.equal(serviceWorker.controlled, true);
  assert(serviceWorker.caches.some((name) => name.startsWith("focusflow-")));
  pass("Service worker activates", serviceWorker.caches.join(", "));

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.getByText("Offline ready").isVisible(), true);
  assert.equal(await page.getByText(taskName).isVisible(), true);
  assert.equal(await page.locator("#root").isVisible(), true);
  pass("Offline reload", "app shell and saved task remain available");
  await context.setOffline(false);

  assert.deepEqual(pageErrors, []);
  pass("Runtime errors", "none");
  await page.screenshot({ path: resolve("test-results/focusflow-desktop.png"), fullPage: true });
  await context.close();

  const deniedContext = await browser.newContext({ viewport: { width: 900, height: 800 } });
  await deniedContext.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(_success, error) {
          setTimeout(() => error({ code: 1 }), 0);
        },
      },
    });
  });
  const deniedPage = await deniedContext.newPage();
  await deniedPage.goto(BASE_URL, { waitUntil: "networkidle" });
  const deniedTaskName = `Permission fallback ${Date.now()}`;
  await deniedPage.getByLabel("What needs your attention?").fill(deniedTaskName);
  await deniedPage.getByRole("button", { name: "Add task" }).click();
  const deniedTask = deniedPage.locator(".task-item", { hasText: deniedTaskName });
  await deniedTask.getByText("Location permission was denied.").waitFor();
  assert.match(
    await deniedTask.locator('[data-testid="task-location"]').innerText(),
    /\| la Unavailable \| lo Unavailable/,
  );
  pass("Permission-denied fallback", "task remains usable and displays a clear location error");
  await deniedContext.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    geolocation: simulatedLocation,
    permissions: ["geolocation"],
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: "networkidle" });
  const mobileLayout = await mobilePage.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
    addButtonVisible: Boolean(document.querySelector('button[aria-label="Add task"]')),
  }));
  assert(mobileLayout.content <= mobileLayout.viewport);
  assert.equal(mobileLayout.addButtonVisible, true);
  pass("Mobile responsive layout", `${mobileLayout.viewport}px viewport, no horizontal overflow`);
  await mobilePage.screenshot({ path: resolve("test-results/focusflow-mobile.png"), fullPage: true });
  await mobileContext.close();

  console.table(results);
  console.log(`\n${results.length}/${results.length} automated checks passed.`);
} finally {
  await browser.close();
}
