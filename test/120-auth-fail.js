const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Login Page ("test-bad-login")', function () {
  this.timeout(Number(config.test_timeout))

  let nightmare = null
  beforeEach(() => {
    nightmare = new Nightmare(config.nightmare)
  })

  describe('given bad data', () => {
    it('Should find a login error message', done => {
      nightmare
      .goto(config.url)
      .wait(Number(config.login_wait))
      .type(config.select.username, 'notgonnawork')
      .type(config.select.password, 'invalid password')
      .click('#clickable-login')
      .wait('div[class^="formMessage"]') // failure
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
