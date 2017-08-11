const Nightmare = require('../xnightmare.js')
const assert = require('assert')
const config = require('../folio-ui.config.js')
const names = require('../namegen.js')
const user = names.namegen()

describe('Using the Apps FOLIO UI App /ui-checkout, /ui-checkin ("new-checkout.js")', function () {
  this.timeout('20s')

  describe("Login > Update settings > Create user > Checkout item > Confirm checkout > Checkin > Confirm checkin > Logout\n", () => {
    let nightmare = new Nightmare(config.nightmare)
    let userid = 'user'
    let barcode = 'item'

    it('should login as ' + config.username + '/' + config.password, done => {
      nightmare
      .on('page', function(type="alert", message) {
        throw new Error(message)
       })
      .goto(config.url)
      .wait(999)
      .type(config.select.username, config.username)
      .type(config.select.password, config.password)
      .click(config.select.submit)
      .wait('#clickable-logout')
      .then(result => { done() })
      .catch(done)
    })
    it('should set patron scan ID to "User"', done => {
      nightmare
      .wait(config.select.settings)
      .click(config.select.settings)
      .wait('a[href="/settings/checkout"]')
      .click('a[href="/settings/checkout"]')
      .wait('a[href="/settings/checkout/checkout"]')
      .click('a[href="/settings/checkout/checkout"]')
      .wait('#patronScanId')
      .wait(222)
      .select('#patronScanId','USER')
      .then(result => { done() })
      .catch(done)
    })
    it('should find an active user ', done => {
      nightmare
      .click('a[title="Users"]')
      .wait('#list-users a:nth-of-type(11) > div:nth-of-type(5)')
      .evaluate(function() {
        return document.querySelector('#list-users a:nth-of-type(11) > div:nth-of-type(5)').title
      })
      .then(function(result) {
        userid = result
        console.log('Found ' + userid)
        done()
      })
      .catch(done)
    })
    it('should find an item to checkout', done=> {
      nightmare
      .click('a[title=Items]')
      .wait(2222)
      .evaluate(function() {
	var element = document.evaluate('//div[.="Available"]/preceding-sibling::div[2]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
	return element.singleNodeValue.innerHTML
      })
      .then(function(result) {
        console.log('Found ' + result)
        barcode = result
        done()
      })
      .catch(done)
    })
    it('should check out ' + barcode + ' to ' + userid, done => {
      nightmare
      .wait('a[title="Check out"]')
      .click('a[title="Check out"]')
      .wait('#patron_identifier')
      .type('#patron_identifier',userid)
      .xclick('//button[contains(.,"Find Patron")]')
      .wait('div[title="' + userid + '"]')
      .type('#barcode',barcode)
      .xclick('//button[contains(.,"Add item")]')
      .wait('div[title="' + barcode + '"]')
      .wait(222)
      .xclick('//button[contains(.,"Done")]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    /* Disabled due to https://issues.folio.org/browse/FOLIO-767
    it('should find ' + barcode + ' in ' + userid + ' history', done => {
      nightmare
      .click('a[title=Users]')
      .wait('#input-user-search')
      .click('#input-user-search~button')
      .wait(222)
      .type('#input-user-search',userid)
      .wait('#list-users div[title="' + userid + '"]')
      .wait(222)
      .click('#list-users div[title="' + userid + '"]')
      .wait(2222)
      .click('#clickable-viewcurrentloans')
      .wait('div[title="' + barcode + '"]~div[title="Open"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    */ 
    it('should check in ' + barcode, done => {
      nightmare
      .click('a[title="Check in"]')
      .wait(222)
      .type('#barcode',barcode)
      .wait(222)
      //.click('#ModuleContainer button') Disabled due to https://issues.folio.org/browse/FOLIO-767
      //.wait('div[title="' + barcode + '"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should confirm that ' + barcode + ' has status of Closed in ' + userid + ' history', done => {
      nightmare
      .click('a[title=Users]')
      .wait('.headerSearchInput---1z5qG')
      .click('.headerSearchClearButton---2MIXs')
      .type('.headerSearchInput---1z5qG',userid)
      .wait(2222)
      .click('div[title="' + userid + '"]')
      .wait(2222)
      .wait('#clickable-viewclosedloans')
      .click('#clickable-viewclosedloans')
      .wait('div[title="' + barcode + '"]~div[title="Closed"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should logout', done => {
      nightmare
      .click('#clickable-logout')
      .wait(config.select.username)
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
