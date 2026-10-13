import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "focusflow-tasks-v1";

const starterTasks = [
  { id: crypto.randomUUID(), title: "Review PWA manifest settings", completed: true, createdAt: Date.now() - 3000 },
  { id: crypto.randomUUID(), title: "Test the app offline", completed: false, createdAt: Date.now() - 2000 },
  { id: crypto.randomUUID(), title: "Run a Lighthouse audit", completed: false, createdAt: Date.now() - 1000 },
];

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : starterTasks;
  } catch {
    return starterTasks;
  }
}

function Icon({ name }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3M7 7l1 13h8l1-13" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></>,
    wifi: <><path d="M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9.5 16.5a4 4 0 0 1 5 0" /><path d="M12 20h.01" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  const counts = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => !task.completed).length,
    completed: tasks.filter((task) => task.completed).length,
  }), [tasks]);

  const visibleTasks = tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const progress = counts.total ? Math.round((counts.completed / counts.total) * 100) : 0;

  function addTask(event) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks((current) => [{ id: crypto.randomUUID(), title, completed: false, createdAt: Date.now() }, ...current]);
    setDraft("");
    inputRef.current?.focus();
  }

  function toggleTask(id) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  function removeTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Application header">
        <a className="brand" href="#top" aria-label="FocusFlow home">
          <img src="./icons/icon-96.png" alt="" />
          <span>FocusFlow</span>
        </a>
        <div className="topbar-actions">
          <span className={`status ${online ? "online" : "offline"}`} role="status">
            <span className="status-dot" />{online ? "Online" : "Offline ready"}
          </span>
          {installPrompt && (
            <button className="install-button" type="button" onClick={installApp}>
              <Icon name="download" /> Install app
            </button>
          )}
        </div>
      </nav>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">YOUR DAY, IN FOCUS</p>
          <h1>Make space for<br /><em>what matters.</em></h1>
          <p className="hero-copy">A calm, offline-ready task list that keeps your priorities close—wherever the day takes you.</p>
        </div>
        <div className="date-card" aria-label="Current date">
          <span>{new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date())}</span>
          <strong>{new Date().getDate()}</strong>
          <small>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date())}</small>
        </div>
      </section>

      <section className="workspace" aria-label="Task manager">
        <div className="composer-card">
          <form onSubmit={addTask}>
            <label htmlFor="new-task">What needs your attention?</label>
            <div className="input-row">
              <input ref={inputRef} id="new-task" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="100" placeholder="Add a new task..." autoComplete="off" />
              <button type="submit" disabled={!draft.trim()} aria-label="Add task"><Icon name="plus" /><span>Add task</span></button>
            </div>
          </form>
          <div className="progress-block">
            <div className="progress-heading"><span>Daily progress</span><strong>{progress}%</strong></div>
            <div className="progress-track" role="progressbar" aria-label="Daily progress" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>
            <p>{counts.completed} completed · {counts.active} remaining</p>
          </div>
        </div>

        <div className="task-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TODAY'S LIST</p>
              <h2>Your tasks <span>{counts.total}</span></h2>
            </div>
            <div className="filters" role="group" aria-label="Filter tasks">
              {["all", "active", "completed"].map((option) => (
                <button key={option} type="button" className={filter === option ? "selected" : ""} onClick={() => setFilter(option)}>{option}</button>
              ))}
            </div>
          </div>

          <div className="task-list" aria-live="polite">
            {visibleTasks.length ? visibleTasks.map((task) => (
              <article className={`task-item ${task.completed ? "done" : ""}`} key={task.id}>
                <label>
                  <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} />
                  <span className="custom-check" aria-hidden="true">✓</span>
                  <span className="task-title">{task.title}</span>
                </label>
                <button type="button" className="delete-button" onClick={() => removeTask(task.id)} aria-label={`Delete ${task.title}`}><Icon name="trash" /></button>
              </article>
            )) : (
              <div className="empty-state">
                <span>✓</span><h3>Nothing here</h3><p>{filter === "all" ? "Add a task to begin your day." : `No ${filter} tasks right now.`}</p>
              </div>
            )}
          </div>

          {counts.completed > 0 && (
            <button className="clear-button" type="button" onClick={() => setTasks((current) => current.filter((task) => !task.completed))}>Clear completed tasks</button>
          )}
        </div>
      </section>

      <footer>
        <span><Icon name="wifi" /> Built for focus, even offline.</span>
        <small>FocusFlow PWA · Dynamic Web Technologies</small>
      </footer>
    </main>
  );
}

