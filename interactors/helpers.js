export function dispatchChange(element) {
  const Event = element.ownerDocument.defaultView ? element.ownerDocument.defaultView.Event = element.ownerDocument.defaultView.Event : window.Event;
  return element.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
}

export function dispatchInput(element, options = {}) {
  let InputEvent = element.ownerDocument.defaultView?.InputEvent || window.InputEvent;
  return element.dispatchEvent(new InputEvent('input', Object.assign({ bubbles: true, cancelable: false }, options)));
}

export function dispatchKeyDown(element, options = {}) {
  let KeyboardEvent = element.ownerDocument.defaultView?.KeyboardEvent || window.KeyboardEvent;
  return element.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, options)));
}

export function dispatchKeyUp(element, options = {}) {
  let KeyboardEvent = element.ownerDocument.defaultView?.KeyboardEvent || window.KeyboardEvent;
  return element.dispatchEvent(new KeyboardEvent('keyup', Object.assign({ bubbles: true, cancelable: true }, options)));
}

// do a best effort at determining the key code
export function guessCode(letter) {
  if(letter.match(/^[a-zA-Z]$/)) {
    return `Key${letter.toUpperCase()}`;
  } else if(letter.match(/^[0-9]$/)) {
    return `Digit${letter}`;
  }
}

export function setValue(element, value) {
  let property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
  if (property && property.set) {
    property.set.call(element, value);
  } else {
    element.value = value;
  }
}
