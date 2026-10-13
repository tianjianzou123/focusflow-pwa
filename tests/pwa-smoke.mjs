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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "allow" });
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

  const taskName = `Offline test ${Date.now()}`;
  const initialCount = await page.locator(".task-item").count();
  await page.getByLabel("What needs your attention?").fill(taskName);
  await page.getByRole("button", { name: "Add task" }).click();
  const createdTask = page.locator(".task-item", { hasText: taskName });
  await createdTask.waitFor();
  assert.equal(await page.locator(".task-item").count(), initialCount + 1);
  await createdTask.locator("label").click();
  assert.equal(await createdTask.locator('input[type="checkbox"]').isChecked(), true);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".task-item", { hasText: taskName }).getAttribute("class"), "task-item done");
  pass("Task workflow and persistence", "add, complete and localStorage reload");

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

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
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

