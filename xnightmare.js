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

module.exports = Nightmare;
