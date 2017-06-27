const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /items', function () {
  this.timeout('20s')
  let nightmare = null

  describe('Login > Create new item > Confirm creation > Edit item > Confirm changes > Logout', () => {
    nightmare = new Nightmare(config.nightmare)

    var ts = new Date().valueOf()
    var barcode = ts

    flogin = function(un, pw) {
      it('should login as ' + un + '/' + pw, done => {
        nightmare
        .goto(config.url)
        .type(config.select.username, un)
        .type(config.select.password, pw)
        .click(config.select.submit)
        .wait('#UserMenuDropDown')
	.wait(555)
        .then(result => { done() })
        .catch(done)
      }) 
    }
    flogout = function() {
      it('should logout', done => {
        nightmare
        .click('#button-logout')
        .wait(config.select.username)
        .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
        .end()
        .then(result => { done() })
        .catch(done)
      })
    }
    flogin(config.username, config.password)
    it('should create item with barcode: ' + barcode, done => {
      nightmare
      .wait('a[Title=Items]')
      .click('a[Title=Items]')
      .wait('.pane---CC1ap .button---2NsdC')
      .click('.pane---CC1ap .button---2NsdC')
      .wait('#additem_title')
      .type('#additem_title', 'Giant steps')
      .type('#additem_materialType', 'b')
      .type('#additem_barcode', barcode)
      .type('#additem_location', 'Storage')
      .type('#additem_loanTypePerm', 'c')
      .type('#additem_loanTypeTemp', 'r')
      .click('button[title="Create New Item"]')
      .wait(2222)
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
      .wait(function(bc) {
        var xp = document.evaluate( '//div[1]/div[.="' + bc + '"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
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
    it('should edit item', done => {
      nightmare
      .click('#ModuleContainer > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div > div.scrollable---9-pBJ > div > div > div:nth-child(1)')
      .wait('button[title="Edit Item"]')
      .click('button[title="Edit Item"]')
      .wait('#additem_title')
      .type('#additem_title', ' (revised edition)')
      .click('button[title="Update Item"')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
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
