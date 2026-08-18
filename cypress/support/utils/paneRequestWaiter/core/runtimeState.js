const runtimeState = {};

export const getRuntimeState = (pane) => {
  runtimeState[pane] = runtimeState[pane] || {};

  return runtimeState[pane];
};

export const resetRuntimeState = (pane) => {
  runtimeState[pane] = {};
};
