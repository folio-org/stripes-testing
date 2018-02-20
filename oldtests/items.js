const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /items', function () {
  this.timeout('20s')

  let nightmare = null
  beforeEach(() => {
    // show true lets you see wth is actually happening :)
    nightmare = new Nightmare(config.nightmare)
  })

  describe('Login as ' + config.username + '/' + config.password + ', load Items module, select material types, execute search, add new item, search for new item...', () => {
    it('should load a page with an "Items" link', done => {
      nightmare
      .goto(config.url)
      .type('input[name=username]', config.username)
      .type('input[name=password]', config.password)
      .click('button[type=submit]')
      .wait('a[title=Items]')
      .click('a[title=Items]')
      .wait('#item\\.book-ItemFilter')
      .click('#item\\.book-ItemFilter') // enable Books
      .click('#item\\.dvd-ItemFilter') // enable DVD
      .type('input[placeholder=Search]', "43620390")

      .wait('div.row---23rwN')
      .click('div.row---23rwN')
      .wait('em')

      .type('input[id="additem_instanceId"]', "instance one")
      .type('input[id="additem_title"]', "my new Book")
      .click('select[id="additem_materialType"]')
      .select('select#additem_materialType', "Book")
      .type('input[id="additem_barcode"]', "1234567")
      .type('input[id="additem_location"]', "Main Library")
      .click('button[class="button---2NsdC primary---5q6-s"]')


      .click('circle') // clean search field
      .type('input[placeholder=Search]', "12")
      .wait(500)

      .click('input[id="location.Main Library-ItemFilter"]') // main lib
      .wait(500)

      .click('table > tbody > tr > td')
      .wait(500)

      //.click('input[id="item.Books-ItemFilter"]') // disable Books


      .click('button[class="ddButton---3nc81"]')
      .wait('h1')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep/3) : 0) // debugging

      .end()
      .then(result => { done() })
      .catch(done)
    })
  })
})
