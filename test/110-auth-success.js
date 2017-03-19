const Nightmare = require('nightmare')
const assert = require('assert')

describe('Using the App', function () {
  this.timeout('6s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare({ show: true })
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


