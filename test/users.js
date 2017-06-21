const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /users', function () {
  this.timeout('15s')

  let nightmare = null

  describe('signing up and finishing setup', () => {
    nightmare = new Nightmare(config.nightmare)

    it('should login as ' + config.username + '/' + config.password, done => {
      nightmare
      .goto(config.url)
      .type(config.select.username, config.username)
      .type(config.select.password, config.password)
      .click(config.select.submit)
      .wait('a[title=Users]')
      .then(result => { done() })
      .catch(done)
      })

    it('enter a search and check "Inactive"', done => {
      nightmare
      .click('a[title=Users]')
      .wait('input[placeholder=Search]')
      .type('input[placeholder=Search]', "bo")
      .wait(555)

      .click('#active\\.Inactive-ItemFilter')
      .wait(555)
      .then(result => { done() })
      .catch(done)
      })
      
      // select campus filter
    it('should select campus filter', done => {
      nightmare
      .click('#pg\\.On-campus-ItemFilter')
      .wait(555)
      .click('#pg\\.Off-campus-ItemFilter')
      .wait(555)
      
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


