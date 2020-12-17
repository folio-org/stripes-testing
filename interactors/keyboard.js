/* eslint-disable no-use-before-define */

import { createInteractor, perform } from '@bigtest/interactor';

export default createInteractor('keyboard')({
  selector: ':focus',
  actions: {
    arrowUp: press('ArrowUp'),
    arrowDown: press('ArrowDown'),
    home: press('Home'),
    end: press('End')
  }
})();


const KEY_CODES = {
  ArrowDown: 40,
  ArrowUp: 38,
  Home: 36,
  End: 35
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
