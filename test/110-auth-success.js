const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Login Page ("110-auth-success.js")', function () {
  this.timeout('20s')

  let nightmare = null

  describe('Login and logout without error', () => {
    nightmare = new Nightmare(config.nightmare)
    it('Login successfully', done => {
      nightmare
      .goto(config.url)
      .wait(Number(config.login_wait))
      .click(config.select.username)
      .insert(config.select.username, config.username)
      .insert(config.select.password, config.password)
      .click(config.select.login)
      .wait('h3')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })

    it('Logout properly', done => {
      nightmare
      .click(config.select.logout) // logout
      .wait('div[class^="loginContainer"') // login page
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep/3) : 0) // debugging

      .end()
      .then(result => { done() })
      .catch(done);
    })
  })
})


