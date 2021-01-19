/* eslint-disable no-use-before-define */

import { createInteractor, perform, Select } from '@bigtest/interactor';

export default createInteractor('keyboard (requires window to have focus)')({
  selector: ':focus',
  actions: {
    arrowUp: press('ArrowUp'),
    arrowDown: press('ArrowDown'),
    arrowLeft: press('ArrowLeft'),
    arrowRight: press('ArrowRight'),
    // using an underscore to signify that this is a temporary workaround
    // we want to use the default browser implementation, but it doesn't
    // trigger the built-in browser functions so we will need a more
    // fleshed out approach to this
    _nextOption: perform(async (el) => {
      if (el.localName === 'select') {
        const options = el.querySelectorAll('option');
        const nextValue = parseInt(el.value, 10) === options.length - 1
          ? '0'
          : `${parseInt(el.value, 10) + 1}`;
        await Select().choose(options.item(nextValue).textContent);
      } else {
        const value = `${parseInt(el.value, 10) + 1}`;
        const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
        property.set.call(el, value);
        el.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true, cancelable: false }));
      }
    }),
    _prevOption: perform(async (el) => {
      if (el.localName === 'select') {
        const options = el.querySelectorAll('option');
        const nextValue = parseInt(el.value, 10) === 0
          ? `${options.length() - 1}`
          : `${parseInt(el.value, 10) - 1}`;
        await Select().choose(options.item(nextValue).textContent);
      } else {
        const value = `${parseInt(el.value, 10) - 1}`;
        const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
        property.set.call(el, value);
        el.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true, cancelable: false }));
      }
    }),
    pageUp: press('PageUp'),
    pageDown: press('PageDown'),
    home: press('Home'),
    end: press('End'),
    enter: press('Enter'),
    escape: press('Escape'),
    alt: press('AltLeft'),
    altLeft: press('AltLeft')
  }
})();

const KEY_CODES = {
  ArrowDown: 40,
  ArrowUp: 38,
  ArrowLeft: 37,
  ArrowRight: 39,
  PageUp: 33,
  PageDown: 34,
  Home: 36,
  End: 35,
  Enter: 13,
  Escape: 27,
  AltLeft: 18
};


function press(code) {
  return perform(async function (el) {
    if (await dispatch(el, 'keydown', code)) {
      await dispatch(el, 'keyup', code);
    }
  });
}

function dispatch(element, eventType, code) {
  return new Promise((resolve, reject) => {
    try {
      const KeyboardEvent = element.ownerDocument.defaultView.KeyboardEvent;
      const event = new KeyboardEvent(eventType, {
        altKey: false,
        code,
        keyCode: KEY_CODES[code],
        ctrlKey: false,
        key: code,
        bubbles: true,
        cancelable: true
      });
      resolve(element.dispatchEvent(event));
    } catch (error) {
      reject(error);
    }
  });
}
