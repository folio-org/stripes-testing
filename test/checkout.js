const Nightmare = require('../xnightmare.js')
const assert = require('assert')
const config = require('../folio-ui.config.js')
const names = require('../namegen.js')
const user = names.namegen()

describe("Using the App FOLIO UI App /scan:", function () {
  this.timeout('20s')

  describe("Login > Update settings > Create user > Checkout item > Confirm checkout > Checkin > Confirm checkin > Logout...", () => {
    let nightmare = new Nightmare(config.nightmare)
    let pgroup = null
    let barcode = 'item'

    it('should login as ' + config.username + '/' + config.password, done => {
      nightmare
      .goto(config.url)
      .type(config.select.username, config.username)
      .type(config.select.password, config.password)
      .click(config.select.submit)
      .wait('#button-logout')
      .then(result => { done() })
      .catch(done)
    })
    it('should set patron scan ID to "User"', done => {
      nightmare
      .wait(config.select.settings)
      .click(config.select.settings)
      .wait('a[href="/settings/scan"]')
      .click('a[href="/settings/scan"]')
      .wait('a[href="/settings/scan/checkout"]')
      .click('a[href="/settings/scan/checkout"]')
      .wait('#patronScanId')
      .wait(222)
      .select('#patronScanId','USER')
      .then(result => { done() })
      .catch(done)
    })
    it('should extract a patron group value', done => {
      nightmare
      .click('a[Title=Users]')
      .wait('#button-newuser')
      .click('#button-newuser')
      .wait('#adduser_group > option:nth-of-type(3)')
      .evaluate(function() {
        return document.querySelector('#adduser_group > option:nth-of-type(3)').value
      })
      .then(function(result) {
        pgroup = result
        done()
      })
      .catch(done)
    })
    it('should create a user with id ' + user.id, done => {
      nightmare
      .type('#adduser_username',user.id)
      .type('#pw',user.password)
      .click('#useractiveYesRB')
      .type('#adduser_firstname',user.firstname)
      .type('#adduser_lastname',user.lastname)
      .type('#adduser_email', user.email)
      .type('#adduser_dateofbirth','10/20/1977')
      .select('#adduser_group',pgroup)
      .type('#adduser_enrollmentdate','01/01/2017')
      .type('#adduser_expirationdate','01/01/2020')
      .type('#adduser_barcode',user.barcode)
      .click('button[title="Create New User"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
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
        barcode = result
        done()
      })
      .catch(done)
    })
    it('should check out ' + barcode + ' to ' + user.id, done => {
      nightmare
      .wait('a[title=Scan]')
      .click('a[title=Scan]')
      .wait('#patron_identifier')
      .type('#patron_identifier',user.id)
      .xclick('//button[contains(.,"Find Patron")]')
      .wait('div[title="' + user.id + '"]')
      .type('#barcode',barcode)
      .click('.pane---CC1ap:nth-of-type(2) button')
      .wait('div[title="' + barcode + '"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .click('form > div > button')
      .then(result => { done() })
      .catch(done)
    })
    it('should find ' + barcode + ' in ' + user.id + ' history', done => {
      nightmare
      .click('a[title=Users]')
      .wait('.headerSearchInput---1z5qG')
      .type('.headerSearchInput---1z5qG',user.id)
      .wait(2222)
      .click('div.row---23rwN')
      .wait('#button-viewfullhistory')
      .click('#button-viewfullhistory')
      .wait('div[title="' + barcode + '"]~div[title="Open"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    }) 
    it('should check in ' + barcode, done => {
      nightmare
      .click('a[title=Scan]')
      .wait('select')
      .select('select','CheckIn')
      .wait(222)
      .type('#barcode',barcode)
      .wait(222)
      .click('#ModuleContainer button')
      .wait('div[title="' + barcode + '"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should confirm that ' + barcode + ' has status of Closed in ' + user.id + ' history', done => {
      nightmare
      .click('a[title=Users]')
      .wait('.headerSearchInput---1z5qG')
      .click('.headerSearchClearButton---2MIXs')
      .type('.headerSearchInput---1z5qG',user.id)
      .wait(1111)
      .click('div.row---23rwN')
      .wait('#button-viewfullhistory')
      .click('#button-viewfullhistory')
      .wait('div[title="' + barcode + '"]~div[title="Closed"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should logout', done => {
      nightmare
      .click('#button-logout')
      .wait(config.select.username)
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
