// eslint-disable-next-line import/prefer-default-export
export const dispatchFocusout = el => {
  el.dispatchEvent(
    new Event('focusout', {
      bubbles: true
    })
  );
  return el.blur();
};
