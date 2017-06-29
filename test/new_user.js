const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')
const names = require('../namegen.js')
const user = names.namegen()


describe('Using the App FOLIO UI App /users', function () {

  this.timeout('20s')
  let nightmare = null
  let pgroup = null

  describe('Login > Create new user > Logout > Login as new user > Logout > Login > Edit new user and confirm changes', () => {
    nightmare = new Nightmare(config.nightmare)

    var phone = '+1 555 234 0000'

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
    flogout = function(end) {
      it('should logout', done => {
        nightmare
        .click('#button-logout')
        .wait(config.select.username)
        .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
        .then(result => { done() })
        .catch(done)
      })
    }
    flogin(config.username, config.password)
    it('should extract a patron group value', done => {
      nightmare
      .wait('a[Title=Users]')
      .click('a[Title=Users]')
      .wait('.button---2NsdC')
      .click('.button---2NsdC')
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
    it('should create a user: ' + user.id + '/' + user.password, done => {
      nightmare
      .type('#adduser_username',user.id)
      .type('#pw',user.password)
      .click('#useractiveYesRB')
      .type('#adduser_firstname',user.firstname)
      .type('#adduser_lastname',user.lastname)
      .type('#adduser_email', user.email)
      .type('#adduser_dateofbirth','04/05/1980')
      .select('#adduser_group', pgroup)
      .type('#adduser_enrollmentdate','01/01/2017')
      .type('#adduser_expirationdate','01/01/2020')
      .type('#adduser_barcode',user.barcode)
      .click('button[title="Create New User"]')
      .wait('.button---2NsdC')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    flogout()
    flogin(user.id,user.password)
    flogout()
    flogin(config.username, config.password)
    it('should edit user: ' + user.id, done => {
      nightmare
      .wait('a[Title=Users]')
      .click('a[Title=Users]')
      .wait('input[placeholder="Search"]')
      .type('input[placeholder="Search"]',user.id)
      .wait(2222)
      .click('div.row---23rwN')
      .wait('button[title="Edit User"]')
      .click('button[title="Edit User"]')
      .wait('#adduser_mobilePhone')
      .type('#adduser_mobilePhone',phone)
      .wait(555)
      .click('button[Title="Update User"]')
      .wait(555)
      .wait(function(pn) {
        var xp = document.evaluate( '//div[.="' + pn + '"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        try { 
          var val = xp.singleNodeValue.innerHTML
          return true
        } catch(e) {
          return false
        } 
      }, phone)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
