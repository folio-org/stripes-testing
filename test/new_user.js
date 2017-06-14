const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /users', function () {
  this.timeout('20s')

  describe('Login > Create new user > Logout > Login as new user > Logout', () => {
    nightmare = new Nightmare(config.nightmare)

    var ts = new Date().valueOf()
    var scan_user = 'newuser' + ts
    var pw = 'newman123'
    var phone = '+1 555 234 0000'

    flogin = function(un, pw) {
      it('should login as ' + un + '/' + pw, done => {
        nightmare
        .goto(config.url)
        .type(config.select.username, un)
        .type(config.select.password, pw)
        .click(config.select.submit)
        .wait('#UserMenuDropDown')
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
        .then(result => { done() })
        .catch(done)
      })
    }
    flogin(config.username, config.password)
    it('should create a user: ' + scan_user + '/' + pw, done => {
      nightmare
      .wait('a[Title=Users]')
      .click('a[Title=Users]')
      .wait('.button---2NsdC')
      .click('.button---2NsdC')
      .type('#adduser_username',scan_user)
      .type('#pw',pw)
      .click('#useractiveYesRB')
      .type('#adduser_firstname','Rupert')
      .type('#adduser_lastname','Newman')
      .type('#adduser_email', scan_user + '@folio.org')
      .type('#adduser_dateofbirth','1980-05-05')
      .type('#adduser_group','oo')
      .type('#adduser_enrollmentdate','2017-01-01')
      .type('#adduser_expirationdate','2020-01-01')
      .type('#adduser_barcode',ts)
      .click('button[title="Create New User"]')
      .wait('.button---2NsdC')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    flogout()
    flogin(scan_user,pw)
    flogout()
    flogin(config.username, config.password)
    it('should edit user: ' + scan_user, done => {
      nightmare
      .wait('a[Title=Users]')
      .click('a[Title=Users]')
      .wait('input[placeholder="Search"]')
      .type('input[placeholder="Search"]',scan_user)
      .wait(555)
      .click('div.row---23rwN')
      .wait('button[title="Edit User"]')
      .click('button[title="Edit User"]')
      .wait('#adduser_mobilePhone')
      .type('#adduser_mobilePhone',phone)
      .wait(555)
      .click('button[Title="Update User"]')
      .wait(function(pn) {
         
      }, phone)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
  })
})
