/* eslint-disable no-use-before-define */

import { createInteractor, perform } from '@bigtest/interactor';

export default createInteractor('keyboard (requires window to have focus)')({
  selector: ':focus',
  actions: {
    arrowUp: press('ArrowUp'),
    arrowDown: press('ArrowDown'),
    arrowLeft: press('ArrowLeft'),
    arrowRight: press('ArrowRight'),
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
