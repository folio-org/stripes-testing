const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /settings/users/groups', function () {
  this.timeout('20s')

  describe('Login > Add new patron group > Assign to user > Try to delete patron group > Logout', () => {
    nightmare = new Nightmare(config.nightmare)

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
    it('should create a patron group', done => {
      nightmare
      .click(config.select.settings)
      .wait('a[href="/settings/users"]')
      .click('a[href="/settings/users"]')
      .wait('a[href="/settings/users/groups"]')
      .click('a[href="/settings/users/groups"]')
      .wait('.paneset---3HNbw > .paneset---3HNbw button')
      .click('.paneset---3HNbw > .paneset---3HNbw button')
      .type('[name=group]','community')
      .type('[name=desc]','Community Member')
      .click('li[data-id^="0"] button:last-of-type')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    flogout()
  })
})
