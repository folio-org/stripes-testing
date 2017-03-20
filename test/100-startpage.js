const Nightmare = require('nightmare')
const assert = require('assert')
const nightmare_opt = require('./.nightmare-debug.js')

describe('Load a Page / 100-startpage', function() {
  // Recommended: 5s locally, 10s to remote server, 30s from airplane
  this.timeout('5s')

  let nightmare = null
  beforeEach(() => {
    nightmare = new Nightmare(nightmare_opt.opt)
  })

  describe('/ (Home Page)', () => {
    it('should load without error', done => {
      // your actual testing urls will likely be `http://localhost:port/path`
      nightmare.goto('http://localhost:3000')
        .wait('button[type=submit]')
        .end()
        .then(function (result) { done() })
        .catch(done)
    })
  })
})