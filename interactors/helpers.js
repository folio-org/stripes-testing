export function dispatchChange(element) {
  const Event = element.ownerDocument.defaultView
    ? element.ownerDocument.defaultView.Event
    : window.Event;
  return element.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
}

export function dispatchInput(element, options = {}) {
  const InputEvent = element.ownerDocument.defaultView
    ? element.ownerDocument.defaultView.InputEvent
    : window.InputEvent;
  return element.dispatchEvent(
    new InputEvent('input', { bubbles: true, cancelable: false, ...options }, options),
  );
}

export function dispatchKeyDown(element, options = {}) {
  const KeyboardEvent = element.ownerDocument.defaultView
    ? element.ownerDocument.defaultView.KeyboardEvent
    : window.KeyboardEvent;
  return element.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options }, options),
  );
}

export function dispatchKeyUp(element, options = {}) {
  const KeyboardEvent = element.ownerDocument.defaultView
    ? element.ownerDocument.defaultView.KeyboardEvent
    : window.KeyboardEvent;
  return element.dispatchEvent(
    new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...options }),
  );
}

// do a best effort at determining the key code
// eslint-disable-next-line consistent-return
export function guessCode(letter) {
  // eslint-disable-line consistent-return
  if (letter.match(/^[a-zA-Z]$/)) {
    return `Key${letter.toUpperCase()}`;
  } else if (letter.match(/^[0-9]$/)) {
    return `Digit${letter}`;
  }
}

export function setValue(element, value) {
  const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
  if (property && property.set) {
    property.set.call(element, value);
  } else {
    element.value = value;
  }
}
