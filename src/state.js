import { loadState, persist } from './utils/storage.js'; // We'll create storage.js later if needed, but for now we keep in state
import { initialState } from './constants.js'; // We'll create constants.js

let state = loadState();

export const getState = () => state;

export const setState = (newState) => {
  state = { ...state, ...newState };
  persist();
  return state;
};

export const resetState = () => {
  state = structuredClone(initialState);
  persist();
  return state;
};

// We'll keep the original functions that operate on state, but they will now receive state as argument or use getState/setState.
// However, to minimize changes, we can keep the original app.js and just split the pure functions.

// For now, we'll export the state and the functions that were in app.js that are pure and can be moved.
// But given the complexity, let's instead create a storage utility and keep the state logic in state.js.

// We'll create a separate file for storage if needed, but for simplicity, we'll keep the loadState and persist in state.js and import them where needed.

// However, the original app.js had loadState and persist as internal functions. Let's move them to state.js.

// Let's define the initialState here to avoid circular dependencies.
export const initialState = {
  session: {
    projectName: "",
    client: "",
    facilitator: "",
    sessionDate: "",
    primaryGoal: "",
  },
  rawNotes: "",
  summaries: {
    objective: "",
    problem: "",
    actors: "",
    rules: "",
    behaviors: "",
    exceptions: "",
    questions: "",
  },
  requirements: [],
  selectedRequirementId: null,
  focusMode: false,
};

// We'll keep the loadState and persist functions in state.js for now.
export function loadState() {
  try {
    const raw = localStorage.getItem("req-codex-elicitation-v2");
    return raw ? { ...structuredClone(initialState), ...JSON.parse(raw) } : structuredClone(initialState);
  } catch (error) {
    console.error("Falha ao carregar estado:", error);
    return structuredClone(initialState);
  }
}

export function persist() {
  localStorage.setItem("req-codex-elicitation-v2", JSON.stringify(state));
}

// We'll also export functions that modify state in a controlled way, but for now, we'll let the components use setState.
// However, the original app.js had many functions that directly mutated state. We'll keep them in a separate file (e.g., mutations.js) or keep them in app.js and use getState/setState.

// Given the scope, let's create a thin app.js that uses modules and keeps the event wiring and rendering.
// We'll move the pure functions to utils and the state-related functions to state.

// For now, we'll just create the state.js with the above and then adjust app.js to use it.