const Nightmare = require('nightmare')
const assert = require('assert')
const nightmare_opt = require('./.nightmare-debug.js')

describe('Login Page / 120-auth-fail', function () {
  this.timeout('9s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare(nightmare_opt.opt)
  })

  describe('given bad data', () => {
    it('should fail', done => {
      nightmare
      .goto('http://localhost:3000')
      .type('input[name=username]', 'notgonnawork')
      .type('input[name=password]', 'invalid password')
      .click('button[type=submit]')
      .wait('button[disabled]') // failure
      .wait('span') // failure
      .end()
      .then(result => { done () })
      .catch(done)
    })
  })
})
