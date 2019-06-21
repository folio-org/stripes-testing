/* eslint-disable no-undef */
Nightmare = require('nightmare');
const debug = require('debug')('nightmare:actions');

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
  function (name, options, parent, win, renderer, done1) {
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
      };
      setTimeout(check, waitTime);
    });

    done1(); // Complete the action's *creation*.
  },
  // The second callback runs on Nightmare's end and determines
  // the action's interface.
  function (waitTime, done) {
    // This is necessary because the action will only work if
    // action arguments are specified before `done`, and because
    // we wish to support calls without arguments.
    if (!done) {
      done = waitTime; // eslint-disable-line no-param-reassign
      waitTime = 500; // eslint-disable-line no-param-reassign
    }

    // `this.child` is Nightmare's reference to the object that
    // passes messages between Electron and Nightmare.
    this.child.call('waitUntilNetworkIdle', waitTime, done);
  });

// Found at https://github.com/segmentio/nightmare/issues/1258
// Useful for AutoSuggest and other dropdowns that are hidden onBlur
Nightmare.action('input',
  function (name, options, parent, win, renderer, done1) {
    parent.respondTo('input', function (value, done) {
      const chars = String(value).split('');

      function type() { // eslint-disable-line
        const ch = chars.shift();
        if (ch === undefined) {
          return done();
        }

        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: ch });
        win.webContents.sendInputEvent({ type: 'char', keyCode: ch }); // keyPress
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: ch });

        setTimeout(type, options.typeInterval); // defer function into next event loop
      }

      // start
      type();
    });

    done1();
  },
  function (selector, text, done) {
    // focus, type
    return this.evaluate_now(
      innerSelector => document.querySelector(innerSelector).focus(),
      () => this.child.call('input', text, done),
      selector
    );
  });

module.exports = Nightmare;
