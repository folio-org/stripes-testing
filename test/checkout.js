const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /scan', function () {
  this.timeout('30s')

  let nightmare = null
  beforeEach(() => {
    nightmare = new Nightmare(config.nightmare)
  })

  describe('signing up and finishing setup', () => {
    var scan_user = 'heath'
    var barcode = '22169083'
    var select_set = 'a[href="/settings"]'
    var select_set_scan = 'a[href="/settings/scan"]'
    var select_set_scan_check = 'a[href="/settings/scan/checkout"]'

    it('should work without timing out', done => {
      nightmare
      .goto(config.url)
      .type(config.select.username, config.username)
      .type(config.select.password, config.password)
      .click(config.select.submit)
      // Go to settings to select user id for checkout
      .wait(select_set)
      .click(select_set)
      .wait(select_set_scan)
      .click(select_set_scan)
      .wait(select_set_scan_check)
      .click(select_set_scan_check)
      .wait('#patronScanId')
      .wait(222)
      .select('#patronScanId','USER')
      .click('a[title=Scan]')
      .wait('#patron_identifier')
      .type('#patron_identifier',scan_user)
      .click('.pane---CC1ap:nth-of-type(1) button')
      .wait('tr[data-row]')
      .type('#barcode',barcode)
      .wait(5000)
      .click('#button-logout')
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


