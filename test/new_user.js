const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /scan', function () {
  this.timeout('20s')

  describe('Login > Create new user > Logout > Login as new user > Logout', () => {
    nightmare = new Nightmare(config.nightmare)

    var ts = new Date().valueOf()
    var scan_user = 'newuser' + ts
    var pw = 'newman123'

    it('should login as ' + config.username + '/' + config.password, done => {
      nightmare
      .goto(config.url)
      .type(config.select.username, config.username)
      .type(config.select.password, config.password)
      .click(config.select.submit)
      .wait('a[Title=Users]')
      .then(result => { done() })
      .catch(done)
    })
    it('should create a user: ' + scan_user + '/' + pw, done => {
      nightmare
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
      .select('#adduser_group','c847c5ca-ac15-42e6-9841-95ff70db86a9')
      .type('#adduser_enrollmentdate','2017-01-01')
      .type('#adduser_expirationdate','2020-01-01')
      .type('#adduser_barcode',ts)
      .click('button[title="Create New User"]')
      .wait('.button---2NsdC')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should logout', done => {
      nightmare
      .click('#button-logout')
      .wait(config.select.username)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should login as ' + scan_user + '/' + pw, done => {
      nightmare
      .goto(config.url)
      .type(config.select.username, scan_user)
      .type(config.select.password, pw)
      .click(config.select.submit)
      .wait('#UserMenuDropDown')
      .then(result => { done() })
      .catch(done)
    })
    it('should logout', done => {
      nightmare
      .click('#button-logout')
      .wait(config.select.username)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
