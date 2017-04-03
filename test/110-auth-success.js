const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Login Page / 110-auth-success', function () {
  this.timeout('15s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare(config.nightmare)
  })

  describe('signing up and finishing setup', () => {

    it('should work without timing out', done => {
      nightmare
      .goto(config.url)
      .type('input[name=username]', config.username)
      .type('input[name=password]', config.password)
      .click('button[type=submit]')
      .wait('h3')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging

      .click('button[class="ddButton---3nc81"]') // logout
      .wait('h1') // login page
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep/3) : 0) // debugging

      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


