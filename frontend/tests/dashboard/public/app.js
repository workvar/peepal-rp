// Dashboard UI bootstrap. Splits into 3 small modules below.
import { Store } from "./store.js";
import { connect } from "./socket.js";
import { render } from "./render.js";

const store = new Store();

connect((evt) => {
  store.apply(evt);
  render(store);
});

// Re-render the elapsed timer every 200ms while a run is active.
setInterval(() => {
  if (store.run.startedAt && !store.run.endedAt) render(store);
}, 200);
