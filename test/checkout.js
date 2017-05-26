const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /scan', function () {
  this.timeout('20s')

  describe('Login, adjust scan/checkout settings, checkout item to a patron, check patron account for item', () => {
    nightmare = new Nightmare(config.nightmare)

    var scan_user = 'heath'
    var barcode = '22169083'
    var select_set_scan = 'a[href="/settings/scan"]'
    var select_set_scan_check = 'a[href="/settings/scan/checkout"]'

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
      .wait(select_set_scan)
      .click(select_set_scan)
      .wait(select_set_scan_check)
      .click(select_set_scan_check)
      .wait('#patronScanId')
      .wait(222)
      .select('#patronScanId','USER')
      .then(result => { done() })
      .catch(done)
    })
    it('should check out ' + barcode + ' to ' + scan_user, done => {
      nightmare
      .wait('a[title=Scan]')
      .click('a[title=Scan]')
      .wait('#patron_identifier')
      .type('#patron_identifier',scan_user)
      .click('.pane---CC1ap:nth-of-type(1) button')
      .wait('tr[data-row]')
      .type('#barcode',barcode)
      .click('.pane---CC1ap:nth-of-type(2) button')
      .wait('.pane---CC1ap:nth-of-type(2) tr[data-row]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should find ' + barcode + ' in ' + scan_user + ' current loans', done => {
      nightmare
      .click('a[title=Users]')
      .wait('.headerSearchInput---1z5qG')
      .type('.headerSearchInput---1z5qG',scan_user)
      .wait('.selected---2W7aQ')
      .click('.selected---2W7aQ')
      .wait('h2')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should logout', done => {
      nightmare
      .click('#button-logout')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
