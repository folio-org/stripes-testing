const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')
const user = require('../namegen.js')

describe('Using the App FOLIO UI App /scan', function () {
  this.timeout('20s')

  describe('Login > Update settings > Create user > Checkout item > Confirm checkout > Checkin > Confirm checkin > Logout', () => {
    nightmare = new Nightmare(config.nightmare)

    var barcode = '22169083'

    it('should login as ' + config.username + '/' + config.password, done => {
      nightmare
      .goto(config.url)
      .type(config.select.username, config.username)
      .type(config.select.password, config.password)
      .click(config.select.submit)
      .wait(config.select.settings)
      .then(result => { done() })
      .catch(done)
    })
    it('should set patron scan ID to "User"', done => {
      nightmare
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
    it('should create a user with id ' + user.id, done => {
      nightmare
      .wait('a[Title=Users]')
      .click('a[Title=Users]')
      .wait('.button---2NsdC')
      .click('.button---2NsdC')
      .type('#adduser_username',user.id)
      .type('#pw',user.password)
      .click('#useractiveYesRB')
      .type('#adduser_firstname',user.firstname)
      .type('#adduser_lastname',user.lastname)
      .type('#adduser_email', user.email)
      .type('#adduser_dateofbirth','1980-05-05')
      .type('#adduser_group','o')
      .type('#adduser_enrollmentdate','2017-01-01')
      .type('#adduser_expirationdate','2020-01-01')
      .type('#adduser_barcode',user.barcode)
      .click('button[title="Create New User"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should check out ' + barcode + ' to ' + user.id, done => {
      nightmare
      .wait('a[title=Scan]')
      .click('a[title=Scan]')
      .wait('#patron_identifier')
      .type('#patron_identifier',user.id)
      .click('.pane---CC1ap:nth-of-type(1) button')
      .wait('tr[data-row]')
      .type('#barcode',barcode)
      .click('.pane---CC1ap:nth-of-type(2) button')
      .wait('.pane---CC1ap:nth-of-type(2) tr[data-row]')
      .wait(555)
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
      .wait('.pane---CC1ap:nth-of-type(3) > div:nth-of-type(2)')
      .click('.pane---CC1ap:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(4) .col-xs-5 button')
      .wait(2222)
      .wait(function(bc) {
        var xp = document.evaluate( '//div[@class="cell---18D9A"][.="' + bc + '"]/following-sibling::div[.="Open"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
	try { 
	  var val = xp.singleNodeValue.innerHTML
	  return true
	} catch(e) {
	  return false
        } 
      }, barcode) 
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
      .wait('tr[data-row]')
      .wait(555)
      .then(result => { done() })
      .catch(done)
    })
    it('should confirm that ' + barcode + ' has status of Closed in ' + user.id + ' history', done => {
      nightmare
      .click('a[title=Users]')
      .wait('.headerSearchInput---1z5qG')
      .type('.headerSearchInput---1z5qG',user.id)
      .wait(1111)
      .click('div.row---23rwN')
      .wait('.pane---CC1ap:nth-of-type(3) > div:nth-of-type(2)')
      .click('.pane---CC1ap:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(4) .col-xs-5 button')
      .wait(555)
      .wait(function(bc) {
        var xp = document.evaluate( '//div[.="' + bc + '"]/following-sibling::div[.="Closed"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
	try { 
	  var val = xp.singleNodeValue.innerHTML
	  return true
	} catch(e) {
	  return false
        } 
      }, barcode)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should logout', done => {
      nightmare
      .click(config.select.logout)
      .wait('div[class^="loginContainer"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .wait(9999)
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
