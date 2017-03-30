const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Login Page / 120-auth-fail', function () {
  this.timeout('9s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare(config.nightmare)
  })

  describe('given bad data', () => {
    it('should fail', done => {
      nightmare
      .goto(config.url)
      .type('input[name=username]', 'notgonnawork')
      .type('input[name=password]', 'invalid password')
      .click('button[type=submit]')
      .wait('button[disabled]') // failure
      .wait('span') // failure
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .end()
      .then(result => { done () })
      .catch(done)
    })
  })
})
