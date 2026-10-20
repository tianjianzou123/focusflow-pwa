import { useCallback, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import Form from "./components/Form.jsx";
import Todo from "./components/Todo.jsx";

const STORAGE_KEY = "tasks";
const LEGACY_STORAGE_KEY = "focusflow-tasks-v1";
const EMPTY_LOCATION = {
  latitude: "—",
  longitude: "—",
  error: "Location was not captured for this task.",
};

const starterTasks = [
  {
    id: "todo-manifest",
    name: "Review PWA manifest settings",
    completed: true,
    createdAt: Date.now() - 3000,
    location: EMPTY_LOCATION,
  },
  {
    id: "todo-offline",
    name: "Test the app offline",
    completed: false,
    createdAt: Date.now() - 2000,
    location: EMPTY_LOCATION,
  },
  {
    id: "todo-lighthouse",
    name: "Run a Lighthouse audit",
    completed: false,
    createdAt: Date.now() - 1000,
    location: EMPTY_LOCATION,
  },
];

function normaliseTask(task) {
  return {
    id: task.id || `todo-${nanoid()}`,
    name: task.name || task.title || "Untitled task",
    completed: Boolean(task.completed),
    createdAt: task.createdAt || Date.now(),
    location: {
      latitude: task.location?.latitude ?? EMPTY_LOCATION.latitude,
      longitude: task.location?.longitude ?? EMPTY_LOCATION.longitude,
      error: task.location?.error ?? EMPTY_LOCATION.error,
    },
  };
}

function usePersistedState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      return saved ? JSON.parse(saved).map(normaliseTask) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function Icon({ name }) {
  const paths = {
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M5 19h14" />
      </>
    ),
    wifi: (
      <>
        <path d="M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9.5 16.5a4 4 0 0 1 5 0" />
        <path d="M12 20h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export default function App() {
  const [tasks, setTasks] = usePersistedState(STORAGE_KEY, starterTasks);
  const [filter, setFilter] = useState("all");
  // Practice 06 Part 2: identify the newest task for the async location result.
  const [lastInsertedId, setLastInsertedId] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);

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

  const counts = useMemo(
    () => ({
      total: tasks.length,
      active: tasks.filter((task) => !task.completed).length,
      completed: tasks.filter((task) => task.completed).length,
    }),
    [tasks],
  );

  const visibleTasks = tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const progress = counts.total
    ? Math.round((counts.completed / counts.total) * 100)
    : 0;

  function addTask(name) {
    const id = "todo-" + nanoid();
    const newTask = {
      id,
      name: name.trim(),
      completed: false,
      createdAt: Date.now(),
      location: { latitude: "##", longitude: "##", error: "##" },
    };

    setLastInsertedId(id);
    setTasks((currentTasks) => [...currentTasks, newTask]);
  }

  // Practice 06 Part 3: attach a returned location to the matching task only.
  const locateTask = useCallback(
    (id, location) => {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === id ? { ...task, location } : task,
        ),
      );
    },
    [setTasks],
  );

  // Practice 06 Part 1: request the device location and handle every outcome.
  const geoFindMe = useCallback(() => {
    if (!lastInsertedId) return;

    if (!("geolocation" in navigator)) {
      locateTask(lastInsertedId, {
        latitude: "Unavailable",
        longitude: "Unavailable",
        error: "Geolocation is not supported by this browser.",
      });
      return;
    }

    const success = (position) => {
      locateTask(lastInsertedId, {
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
        error: "",
      });
    };

    const error = (locationError) => {
      const messages = {
        1: "Location permission was denied.",
        2: "Your location is currently unavailable.",
        3: "The location request timed out.",
      };

      locateTask(lastInsertedId, {
        latitude: "Unavailable",
        longitude: "Unavailable",
        error: messages[locationError.code] || "Unable to retrieve your location.",
      });
    };

    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    });
  }, [lastInsertedId, locateTask]);

  function toggleTaskCompleted(id) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function deleteTask(id) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id),
    );
  }

  function editTask(id, newName) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, name: newName.trim() } : task,
      ),
    );
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
            <span className="status-dot" />
            {online ? "Online" : "Offline ready"}
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
          <h1>
            Make space for
            <br />
            <em>what matters.</em>
          </h1>
          <p className="hero-copy">
            A location-aware, offline-ready task list that keeps your priorities
            close—wherever the day takes you.
          </p>
        </div>
        <div className="date-card" aria-label="Current date">
          <span>
            {new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date())}
          </span>
          <strong>{new Date().getDate()}</strong>
          <small>
            {new Intl.DateTimeFormat("en", {
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </small>
        </div>
      </section>

      <section className="workspace" aria-label="Task manager">
        <div className="composer-card">
          <Form addTask={addTask} geoFindMe={geoFindMe} />
          <div className="progress-block">
            <div className="progress-heading">
              <span>Daily progress</span>
              <strong>{progress}%</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Daily progress"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              {counts.completed} completed · {counts.active} remaining
            </p>
          </div>
          <p className="location-note">
            <span aria-hidden="true">⌖</span>
            New tasks request your current location. You can allow or deny access.
          </p>
        </div>

        <div className="task-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TODAY&apos;S LIST</p>
              <h2>
                Your tasks <span>{counts.total}</span>
              </h2>
            </div>
            <div className="filters" role="group" aria-label="Filter tasks">
              {["all", "active", "completed"].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={filter === option ? "selected" : ""}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="task-list" aria-live="polite">
            {visibleTasks.length ? (
              visibleTasks.map((task) => (
                <Todo
                  id={task.id}
                  name={task.name}
                  completed={task.completed}
                  key={task.id}
                  latitude={task.location.latitude}
                  longitude={task.location.longitude}
                  locationError={task.location.error}
                  toggleTaskCompleted={toggleTaskCompleted}
                  deleteTask={deleteTask}
                  editTask={editTask}
                />
              ))
            ) : (
              <div className="empty-state">
                <span>✓</span>
                <h3>Nothing here</h3>
                <p>
                  {filter === "all"
                    ? "Add a task to begin your day."
                    : `No ${filter} tasks right now.`}
                </p>
              </div>
            )}
          </div>

          {counts.completed > 0 && (
            <button
              className="clear-button"
              type="button"
              onClick={() =>
                setTasks((currentTasks) =>
                  currentTasks.filter((task) => !task.completed),
                )
              }
            >
              Clear completed tasks
            </button>
          )}
        </div>
      </section>

      <footer>
        <span>
          <Icon name="wifi" /> Built for focus, even offline.
        </span>
        <small>FocusFlow PWA · Dynamic Web Technologies · Practice 06</small>
      </footer>
    </main>
  );
}
