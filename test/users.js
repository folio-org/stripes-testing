const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('./.folio-ui-config.js')

describe('Using the App Folio UI App /users', function () {
  this.timeout('10s')

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
      
      .click('a[title=Users] > span')
      .wait('em')
      
      .click('input[id="pg.On-campus-ItemFilter"]')
      .wait('em')
      
      .type('input[placeholder=Search]', "da")
      .wait('em')
      
      .click('input[id="active.Inactive-ItemFilter"]')
      .wait('em')
      
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      
      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


