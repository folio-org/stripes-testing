Nightmare = require('nightmare')

Nightmare.action('xclick', function(selector, done) {
  this.evaluate_now(function(selector) {
    document.activeElement.blur();
    var element = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    if (!element) {
      throw new Error('Unable to find element by selector: ' + selector);
    }
    var event = document.createEvent('MouseEvent');
    event.initEvent('click', true, true);
    element.dispatchEvent(event)
  }, done, selector);
})

Nightmare.action('xtract', function(selector, done) {
  this.evaluate_now(function(selector) {
    var element = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    if (!element) {
      throw new Error('Unable to find element by selector: ' + selector);
    }
    return element.textContent
  }, done, selector);
})

module.exports = Nightmare
