/* eslint-disable no-undef */
Nightmare = require('nightmare');
const debug = require('debug')('nightmare:actions');

Nightmare.action('xclick', function xclick(selector, done) {
  debug(`.xclick() on ${selector}`);
  this.evaluate_now((select) => {
    document.activeElement.blur();
    const element = document.evaluate(select, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!element) {
      throw new Error(`Unable to find element by selector: ${select}`);
    }
    const event = document.createEvent('MouseEvent');
    event.initEvent('click', true, true);
    element.dispatchEvent(event);
  }, done, selector);
});

Nightmare.action('xtract', function xtract(selector, done) {
  debug(`.xtract() on ${selector}`);
  this.evaluate_now((select) => {
    const element = document.evaluate(select, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!element) {
      throw new Error(`Unable to find element by selector: ${select}`);
    }
    return element.textContent;
  }, done, selector);
});

/* Found at https://intoli.com/blog/nightmare-network-idle/ */
Nightmare.action('waitUntilNetworkIdle',
  // The first callback defines the action on Electron's end,
  // making some internal objects available.
  function (name, options, parent, win, renderer, done) {

    // `parent` is Electron's reference to the object that
    // passes messages between Electron and Nightmare.
    parent.respondTo('waitUntilNetworkIdle', (waitTime, done) => {
      let lastRequestTime = Date.now();

      // win.webContents allows us to control the internal
      // Electron BrowserWindow instance.
      win.webContents.on('did-get-response-details', () => {
        lastRequestTime = Date.now();
      });

      const check = () => {
        const now = Date.now();
        const elapsedTime = now - lastRequestTime;
        if (elapsedTime >= waitTime) {
          done(); // Complete the action.
        } else {
          setTimeout(check, waitTime - elapsedTime);
        }
      }
      setTimeout(check, waitTime);
    });

    done(); // Complete the action's *creation*.
  },
  // The second callback runs on Nightmare's end and determines
  // the action's interface.
  function (waitTime, done) {
    // This is necessary because the action will only work if
    // action arguments are specified before `done`, and because
    // we wish to support calls without arguments.
    if (!done) {
      done = waitTime;
      waitTime = 500;
    }

    // `this.child` is Nightmare's reference to the object that
    // passes messages between Electron and Nightmare.
    this.child.call('waitUntilNetworkIdle', waitTime, done);
  }
);

module.exports = Nightmare;
