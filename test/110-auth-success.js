const Nightmare = require('nightmare')
const assert = require('assert')

describe('Using the App', function () {
  this.timeout('60s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare({ show: false })
  })

  describe('signing up and finishing setup', () => {
    it('should work without timing out', done => {
      nightmare
      .goto('http://localhost:3000')
      .type('input[name=username]', 'diku_admin')
      .type('input[name=password]', 'admin')
      .click('button[type=submit]')
      .wait('h3')
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


