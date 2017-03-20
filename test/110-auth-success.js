const Nightmare = require('nightmare')
const assert = require('assert')
const nightmare_opt = require('./.nightmare-debug.js')

describe('Login Page / 120-auth-success', function () {
  this.timeout('6s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare(nightmare_opt.opt)
  })

  describe('signing up and finishing setup', () => {
    let username = process.env.FOLIO_UI_USERNAME
    let password = process.env.FOLIO_UI_PASSWORD
    
    it('should work without timing out', done => {
      nightmare
      .goto('http://localhost:3000')
      .type('input[name=username]', username)
      .type('input[name=password]', password)
      .click('button[type=submit]')
      .wait('h3')
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


