const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App Folio UI App /items', function () {
  this.timeout('20s')

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
      
      .click('a[title=Items] > span')
      //.wait('h1')
      //.wait(2000)
      .wait('em')
      
      .click('input[id="item.DVDs-ItemFilter"]') // DVD only
      
      .click('button[class="button---2NsdC primary---5q6-s fullWidth---2bppW"]')
      .wait('em')
      
      .type('input[id="additem_instanceId"]', "instance one")
      .type('input[id="additem_title"]', "my new book")
      .type('input[id="additem_materialType"]', "Book")
      .type('input[id="additem_barcode"]', "1234")
      .type('input[id="additem_location"]', "basement")
      .click('button[class="button---2NsdC primary---5q6-s"]')
      
      .click('input[id="location.Main Library-ItemFilter"]') // main lib
      
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


