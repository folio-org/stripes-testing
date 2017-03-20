const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('./.folio-ui-config.js')

describe('Using the App Folio UI App /scan', function () {
  this.timeout('10s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare(config.nightmare)
  })

  describe('signing up and finishing setup', () => {
    let username = process.env.FOLIO_UI_USERNAME
    let password = process.env.FOLIO_UI_PASSWORD
    
    it('should work without timing out', done => {
      nightmare
      .goto(config.url)
      .type('input[name=username]', username)
      .type('input[name=password]', password)
      .click('button[type=submit]')
      .wait('h3')
      
      .click('a[title=Scan] > span')
      //.wait('h1')
      //.wait(2000)
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


