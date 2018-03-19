const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /items ("test-new-item")', function () {
  this.timeout(Number(config.test_timeout))
  let nightmare = null

  describe("Login > Create new item > Confirm creation > Edit item > Confirm changes > Logout\n", () => {
    nightmare = new Nightmare(config.nightmare)

    var ts = new Date().valueOf()
    var barcode = ts

    flogin = function(un, pw) {
      it('should login as ' + un + '/' + pw, done => {
        nightmare
        .on('page', function(type="alert", message) {
           throw new Error(message)
        })
        .goto(config.url)
        .wait(Number(config.login_wait))
        .insert(config.select.username, un)
        .insert(config.select.password, pw)
        .click('#clickable-login')
        .wait('#UserMenuDropDown')
        .wait(555)
        .then(result => { done() })
        .catch(done)
      })
    }
    flogout = function() {
      it('should logout', done => {
        nightmare
        .click('#clickable-logout')
        .wait(config.select.username)
        .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
        .end()
        .then(result => { done() })
        .catch(done)
      })
    }
    flogin(config.username, config.password)
    it('should create item with barcode: ' + barcode, done => {
      nightmare
      .wait('#clickable-items-module')
      .wait(200)
      .click('#clickable-items-module')
      .wait('.pane---CC1ap .button---2NsdC')
      .click('.pane---CC1ap .button---2NsdC')
      .wait('#additem_title')
      .wait(200)
      .type('#additem_title', 'Giant steps')
      .type('#additem_materialType', 'b')
      .type('#additem_barcode', barcode)
      .type('#additem_location', 'Storage')
      .type('#additem_loanTypePerm', 'c')
      .type('#additem_loanTypeTemp', 'r')
      .click('button[title="Create New Item"]')
      .wait(200)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should find item with barcode: ' + barcode, done => {
      nightmare
      .click('.brandingLabel---3A6hB')
      .wait('h3')
      .wait('a[Title=Items]')
      .click('a[Title=Items]')
      .wait('input[placeholder=Search')
      .type('input[placeholder=Search', barcode)
      .wait('div[title="' + barcode + '"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should edit item', done => {
      nightmare
      .click('div[title="' + barcode + '"]')
      .wait('button[title="Edit Item"]')
      .click('button[title="Edit Item"]')
      .wait('#additem_title')
      .type('#additem_title', ' (revised edition)')
      .click('button[title="Update Item"')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should confirm changes', done => {
      nightmare
      .wait(function(bc) {
        var xp = document.evaluate( '//div[@class="kvValue---1ImHP"][contains(.,"revised")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        try {
          var val = xp.singleNodeValue.innerHTML
          return true
        } catch(e) {
          return false
        }
      }, barcode)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    flogout();
  })
})
