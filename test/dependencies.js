const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /about ("dependencies.js")', function () {
  this.timeout('20s')
  let nightmare = null

  describe("Login > Click \"About\" link > Check for dependency errors > Logout\n", () => {
    nightmare = new Nightmare(config.nightmare)
    flogin = function(un, pw) {
      it('should login as ' + un + '/' + pw, done => {
        nightmare
        .goto(config.url)
	.wait(555)
        .type(config.select.username, un)
        .type(config.select.password, pw)
        .click(config.select.submit)
        .wait('#UserMenuDropDown')
	.wait(555)
        .then(result => { done() })
        .catch(done)
      }) 
    }
    flogout = function() {
      it('should logout', done => {
        nightmare
        .click('#clickable-logout')
        .wait(config.select.username)
        .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
        .end()
        .then(result => { done() })
        .catch(done)
      })
    }

    flogin(config.username, config.password)
    it('should load "about" page', done => {
      nightmare
      .click('a[href="/about"]')
      .wait(555)
      .then(result => { done() })
      .catch(done)
    })
    it('should find no "red" errors', done => {
      nightmare
      .evaluate(function() {
        var elements = document.querySelectorAll('li[style*=" red"]')
	var msgs = new Array();
	for (x = 0; x < elements.length; x++) {
	  msgs.push(elements[x].textContent)  
	}
	if (msgs.length > 0) {
	  throw new Error("Interfaces that are required but absent:\n" + msgs.join("\n"))
	}
      })
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should find no "orange" errors', done => {
      nightmare
      .evaluate(function() {
        var elements = document.querySelectorAll('li[style*="orange"]')
	var msgs = new Array();
	for (x = 0; x < elements.length; x++) {
	  msgs.push(elements[x].textContent)  
	}
	if (msgs.length > 0) {
	  throw new Error("Interfaces that are required but present only in an incompatible version:\n" + msgs.join("\n"))
	}
      })
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    flogout();
  })
})
