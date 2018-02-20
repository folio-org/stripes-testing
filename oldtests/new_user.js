const Nightmare = require('../xnightmare.js')
const assert = require('assert')
const config = require('../folio-ui.config.js')
const names = require('../namegen.js')
const user = names.namegen()


describe('Using the App FOLIO UI App /users ("test-new-user")', function () {

  this.timeout(Number(config.test_timeout))
  let nightmare = null
  let pgroup = null

  describe('Login > Create new user > Logout > Login as new user > Logout > Login > Edit new user and confirm changes', () => {
    nightmare = new Nightmare(config.nightmare)

    var phone = user.address.phone

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
        .wait(555)
        .wait(function() {
          var success = document.querySelector('#clickable-logout')
          var fail = document.querySelector('span[class^="loginError"]')
          if (fail) {
            throw new Error(fail.textContent);
            return false
          }
          else if (success) {
            return true
          }
        })
        .wait(555)
        .then(result => { done() })
        .catch(done)
      })
    }
    flogout = function(end) {
      it('should logout', done => {
        nightmare
        .click('#clickable-logout')
        .wait('#clickable-login')
        .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
        .then(result => { done() })
        .catch(done)
      })
    }
    flogin(config.username, config.password)
    it('should extract a patron group value', done => {
      nightmare
      .wait('#clickable-users-module')
      .click('#clickable-users-module')
      .wait('#clickable-newuser')
      .wait(555)
      .click('#clickable-newuser')
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
      .xclick('//button[contains(.,"ddress")]')
      .wait(555)
      .click('input[id^="PrimaryAddress"]')
      .type('input[name=country]',user.address.country)
      .type('input[name*="addressLine1"]',user.address.address)
      .type('input[name*="city"]',user.address.city)
      .type('input[name*="stateRegion"]',user.address.state)
      .type('input[name*="zipCode"]',user.address.zip)
      .select('select[name*="addressType"]','Home')
      .click('#clickable-createnewuser')
      .wait('#clickable-newuser')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    flogout()
    flogin(user.id,user.password)
    flogout()
    flogin(config.username, config.password)
    it('should edit user: ' + user.id, done => {
      nightmare
      .wait('#clickable-users-module')
      .click('#clickable-users-module')
      .wait('#input-user-search')
      .type('#input-user-search',user.id)
      .wait(555)
      .click('.row---23rwN')
      .wait('#clickable-edituser')
      .click('#clickable-edituser')
      .wait('#adduser_mobilePhone')
      .wait(555)
      .type('#adduser_mobilePhone',null)
      .type('#adduser_mobilePhone',phone)
      .wait(555)
      .click('#clickable-updateuser')
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
