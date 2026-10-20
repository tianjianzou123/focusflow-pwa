import { useEffect, useRef, useState } from "react";

function ActionIcon({ name }) {
  const paths = {
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3M7 7l1 13h8l1-13" />
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

export default function Todo({
  id,
  name,
  completed,
  latitude,
  longitude,
  locationError,
  toggleTaskCompleted,
  deleteTask,
  editTask,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(name);
  const editInputRef = useRef(null);
  const editButtonRef = useRef(null);
  const isLocating = latitude === "##" && longitude === "##";
  const hasLocationError = Boolean(locationError && locationError !== "##");

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  function handleEditSubmit(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    editTask(id, newName);
    setIsEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  function cancelEditing() {
    setNewName(name);
    setIsEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  return (
    <article className={`task-item ${completed ? "done" : ""}`} data-task-id={id}>
      {isEditing ? (
        <form className="edit-form" onSubmit={handleEditSubmit}>
          <label htmlFor={`${id}-edit`} className="visually-hidden">
            New name for {name}
          </label>
          <input
            ref={editInputRef}
            id={`${id}-edit`}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength="100"
          />
          <div className="edit-actions">
            <button className="save-button" type="submit" disabled={!newName.trim()}>
              Save
            </button>
            <button className="cancel-button" type="button" onClick={cancelEditing}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <label className="task-main" htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              checked={completed}
              onChange={() => toggleTaskCompleted(id)}
            />
            <span className="custom-check" aria-hidden="true">
              ✓
            </span>
            <span className="task-copy">
              <span className="task-title">{name}</span>
              <span
                className={`task-location ${isLocating ? "locating" : ""}`}
                data-testid="task-location"
                aria-label={`Latitude ${latitude}, longitude ${longitude}`}
              >
                {/* Practice 06 Parts 5–6: display the location props beside the task. */}
                {isLocating && <span className="location-pulse" aria-hidden="true" />}
                | la {latitude} | lo {longitude}
              </span>
              {hasLocationError && (
                <span className="location-error">{locationError}</span>
              )}
            </span>
          </label>
          <div className="task-actions">
            <button
              ref={editButtonRef}
              type="button"
              className="edit-button"
              onClick={() => setIsEditing(true)}
              aria-label={`Edit ${name}`}
            >
              <ActionIcon name="edit" />
            </button>
            <button
              type="button"
              className="delete-button"
              onClick={() => deleteTask(id)}
              aria-label={`Delete ${name}`}
            >
              <ActionIcon name="trash" />
            </button>
          </div>
        </>
      )}
    </article>
  );
}

