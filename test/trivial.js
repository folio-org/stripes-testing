const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the Folio UI App /trivial', function () {
  this.timeout('15s')

  let nightmare = null
  //beforeEach(() => {
  //  // show true lets you see wth is actually happening :)
  //  nightmare = new Nightmare(config.nightmare)
  //})

  describe('signing up and finishing setup', () => {
    it('login', done => {
      nightmare = new Nightmare(config.nightmare)
      
      nightmare = nightmare
      .goto(config.url)
      .type('input[name=username]', config.username)
      .type('input[name=password]', config.password)
      .click('button[type=submit]')
      .wait('h3')
      
      done();
    });
            
    it('fill out form', done => {

      nightmare      
      .click('a[title=Trivial] > span') // Hi Kurt
      .type("input[id=g]", "Ho")
      .type("input[id=n]", "Karl")
      .click('button[type=submit]')
      
      .wait('h3')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


