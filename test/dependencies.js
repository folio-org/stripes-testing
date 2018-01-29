const Nightmare = require('nightmare')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Checking for dependency issues on FOLIO UI App /about ("test-dependencies")', function () {
  this.timeout(Number(config.test_timeout))
  let nightmare = null

  describe("Login > Click \"About\" link > Check for dependency errors > Logout\n", () => {
    nightmare = new Nightmare(config.nightmare)
    flogin = function(un, pw) {
      it('should login as ' + un + '/' + pw, done => {
        nightmare
        .goto(config.url)
        .wait(Number(config.login_wait))
        .insert(config.select.username, un)
        .insert(config.select.password, pw)
        .click('#clickable-login')
        .wait('#clickable-logout')
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
      .click('#clickable-settings')
      .click('a[href="/settings/about"]')
      .wait(555)
      .then(result => { done() })
      .catch(done)
    })
    it('should check for "red" errors', done => {
      nightmare
      .evaluate(function() {
        var elements = document.querySelectorAll('li[style*=" red"]')
        var msgs = new Array();
        for (x = 0; x < elements.length; x++) {
          msgs.push(elements[x].textContent)  
        }
        if (msgs.length > 0) {
          msgs.push("Interfaces that are required but absent:")
        }
      })
      .then(result => { 
        done()
	if (result !== null) {
          for (x = 0; x < result.length; x++) {
	    console.log('          WARN:', result[x])
	  }
	}
      })
      .catch(done)
    })
    it('should check for "orange" errors', done => {
      nightmare
      .evaluate(function() {
        var elements = document.querySelectorAll('li[style*="orange"]')
        var msgs = new Array();
        for (x = 0; x < elements.length; x++) {
          msgs.push('* ' + elements[x].textContent)  
        }
        if (msgs.length > 0) {
	  msgs.unshift("Interfaces that are required but present only in an incompatible version:")
	  return msgs
        }
      })
      .then(result => { 
        done()
	if (result !== null) {
          for (x = 0; x < result.length; x++) {
	    console.log('          WARN:', result[x])
	  }
	}
      })
      .catch(done)
    })
    flogout();
  })
})
