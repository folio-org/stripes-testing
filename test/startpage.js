const Nightmare = require('nightmare')
const assert = require('assert')

describe('Load a Page', function() {
  // Recommended: 5s locally, 10s to remote server, 30s from airplane
  this.timeout('30s')

  let nightmare = null
  beforeEach(() => {
    nightmare = new Nightmare({ show: true })
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