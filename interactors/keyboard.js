/* eslint-disable no-use-before-define */

import { createInteractor, Select } from '@interactors/html';


export default createInteractor('keyboard (requires window to have focus)')
  .selector(':focus')
  .actions({
    arrowUp: press('ArrowUp'),
    arrowDown: press('ArrowDown'),
    arrowLeft: press('ArrowLeft'),
    arrowRight: press('ArrowRight'),
    backspace: press('Backspace'),
    control: press('Control'),
    // next/prevOption and increment/decrementNumber are workarounds
    // as we want to use the default browser implementation,
    // but it doesn't trigger the built-in browser functions
    nextOption: ({ perform }) => perform(async (el) => {
      const options = el.querySelectorAll('option');
      const nextValue = parseInt(el.value, 10) === options.length - 1
        ? '0'
        : `${parseInt(el.value, 10) + 1}`;
      await Select().choose(options.item(nextValue).textContent);
    }),
    prevOption: ({ perform }) => perform(async (el) => {
      const options = el.querySelectorAll('option');
      const nextValue = parseInt(el.value, 10) === 0
        ? `${options.length() - 1}`
        : `${parseInt(el.value, 10) - 1}`;
      await Select().choose(options.item(nextValue).textContent);
    }),
    incrementNumber: ({ perform }) => perform(async (el) => {
      const value = `${parseInt(el.value, 10) + 1}`;
      const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      property.set.call(el, value);
      el.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true, cancelable: false }));
    }),
    decrementNumber: ({ perform }) => perform(async (el) => {
      const value = `${parseInt(el.value, 10) - 1}`;
      const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
      property.set.call(el, value);
      el.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true, cancelable: false }));
    }),
    pageUp: press('PageUp'),
    pageDown: press('PageDown'),
    home: press('Home'),
    end: press('End'),
    enter: press('Enter'),
    escape: press('Escape'),
    alt: press('AltLeft'),
    altLeft: press('AltLeft'),
    tab: press('Tab'),
    space: press('Space'),
    pressKey: (interactor, value, options) => press(value)(interactor, options)
  })();

const KEY_CODES = {
  ArrowDown: 40,
  ArrowUp: 38,
  ArrowLeft: 37,
  ArrowRight: 39,
  Backspace: 8,
  PageUp: 33,
  PageDown: 34,
  Home: 36,
  End: 35,
  Enter: 13,
  Escape: 27,
  AltLeft: 18,
  Space: 32,
  Tab: 9
};


function press(code) {
  return (interactor, options) => {
    return interactor.perform(async (el) => {
      if (await dispatch(el, 'keydown', code, options)) {
        await dispatch(el, 'keyup', code, options);
      }
    });
  };
}


function dispatch(element, eventType, code, options) {
  return new Promise((resolve, reject) => {
    try {
      const KeyboardEvent = element.ownerDocument.defaultView.KeyboardEvent;
      const event = new KeyboardEvent(eventType, {
        altKey: (options && options.altKey) || false,
        code,
        keyCode: KEY_CODES[code],
        ctrlKey: (options && options.ctrlKey) || false,
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
