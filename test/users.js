const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /users', function () {
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

      .click('a[title=Users] > span')
      .wait('em')

      .type('input[placeholder=Search]', "bo")
      .wait('em')

      .click('input[id="active.Inactive-ItemFilter"]')
      .wait('em')
      
      // select campus filter
      .click('input[id="pg.On-campus-ItemFilter"]')
      .wait('em')
      .click('input[id="pg.Off-campus-ItemFilter"]')
      .wait('em')
      
      // de-select campus filter
      .click('input[id="pg.On-campus-ItemFilter"]')
      .click('input[id="pg.Off-campus-ItemFilter"]')
      .wait('em')
      
      .wait(500)
      .click('input[id="active.Active-ItemFilter"]')
      .wait('em')

      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging

      .click('button[class="ddButton---3nc81"]')
      .wait('h1')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep/3) : 0) // debugging

      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})


