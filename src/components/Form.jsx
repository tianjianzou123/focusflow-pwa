import { useEffect, useRef, useState } from "react";

export default function Form(props) {
  const { addTask, geoFindMe } = props;
  const [name, setName] = useState("");
  const [addition, setAddition] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (addition) {
      // Practice 06 Part 7: run once after addTask has stored lastInsertedId.
      geoFindMe();
      setAddition(false);
    }
  }, [addition, geoFindMe]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) return;

    setAddition(true);
    addTask(name);
    setName("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="new-task">What needs your attention?</label>
      <div className="input-row">
        <input
          ref={inputRef}
          id="new-task"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength="100"
          placeholder="Add a new task..."
          autoComplete="off"
        />
        <button type="submit" disabled={!name.trim()} aria-label="Add task">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Add task</span>
        </button>
      </div>
    </form>
  );
}
