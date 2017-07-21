const Nightmare = require('../xnightmare.js')
const assert = require('assert')
const config = require('../folio-ui.config.js')

describe('Using the App FOLIO UI App /settings/users/groups', function () {
  this.timeout('30s')
  let userid = null;
  let communityid = null;
  let staffid = null;
  let alert = null;

  describe("Login > Add new patron group > Assign to user > Try to delete patron group > Logout\n", () => {
    nightmare = new Nightmare(config.nightmare)

    flogin = function(un, pw) {
      it('should login as ' + un + '/' + pw, done => {
        nightmare
        .on('page', function(type="alert", message) {
           alert = message;
        })
        .goto(config.url)
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
        .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
        .end()
        .then(result => { done() })
        .catch(done)
      })
    }
    flogin(config.username, config.password)
    it('should create a patron group for "Community"', done => {
      nightmare
      .click(config.select.settings)
      .wait('a[href="/settings/users"]')
      .click('a[href="/settings/users"]')
      .wait('a[href="/settings/users/groups"]')
      .click('a[href="/settings/users/groups"]')
      .wait('.paneset---3HNbw > .paneset---3HNbw button')
      .xclick('//button[contains(.,"Add type")]')
      .type('[name=group]','community')
      .type('[name=desc]','Community Member')
      .click('li[data-id^="0"] button:last-of-type')
      .wait(2222)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should find a user to edit', done => {
      nightmare
      .click('a[title="Users"]')
      .wait('#list-users a:nth-of-type(11) > div:nth-of-type(5)')
      .evaluate(function() {
        return document.querySelector('#list-users a:nth-of-type(11) > div:nth-of-type(5)').title
      })
      .then(function(result) {
        userid = result
        console.log('Found ' + userid)
	done()
      })
      .catch(done)
    })
    it('should find patron group ID for "Community"', done => {
      nightmare
      .type('.headerSearchInput---1z5qG', userid)
      .wait('div[title="' + userid + '"]')
      .click('div[title="' + userid + '"]')
      .wait('#clickable-edituser')
      .click('#clickable-edituser')
      .wait('#adduser_group')
      .xtract('id("adduser_group")/option[contains(.,"Community")]/@value')
      .then(function(result) {
        communityid = result
        console.log('Found ' + communityid)
	done()
      })
      .catch(done)
    })
    it('should edit user record using "Community" group', done => {
      nightmare
      .select('#adduser_group', communityid)
      .click('#clickable-updateuser')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should fail at deleting "Community" group', done => {
      nightmare
      .wait(4444)
      .xclick('//span[.="Settings"]')
      .click('a[href="/settings/users"]')
      .wait('a[href="/settings/users/groups"]')
      .click('a[href="/settings/users/groups"]')
      .wait('.paneset---3HNbw > .paneset---3HNbw button')
      .xclick('//li[@data-id="' + communityid + '"]//button[.="Delete"]')
      .wait(555)
      .evaluate(function(communityid) {
        var cnode = document.querySelector('li[data-id="' + communityid + '"]')
	if (!cnode) {
	  throw new Error('Community patron group NOT found after clicking "Delete" button!')
	}
      }, communityid)
      /*.evaluate(function(msg) {
        if (!msg.match(/ERROR/)) { throw new Error("No error alert detected!") }
      }, alert) */
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(function(result) { 
        done()
       })
      .catch(done)
    })
    it('should find ID for "Staff" group', done => {
      nightmare
      .click('a[title=Users]')
      .wait('.headerSearchInput---1z5qG')
      .click('button[class^="headerSearchClearButton"]')
      .type('.headerSearchInput---1z5qG', userid)
      .wait('div[title="' + userid + '"]')
      .click('div[title="' + userid + '"]')
      .wait('#clickable-edituser')
      .click('#clickable-edituser')
      .wait('#adduser_group')
      .xtract('id("adduser_group")/option[contains(.,"Staff")]/@value')
      .then(function(result) {
        staffid = result
        console.log('Found ' + staffid)
	done()
      })
      .catch(done)
    })
    it('should change patron group to "Staff" in user record', done => {
      nightmare
      .select('#adduser_group', staffid)
      .click('#clickable-updateuser')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    })
    it('should delete "Community" patron group', done => {
      nightmare
      .wait(555)
      .xclick('//span[.="Settings"]')
      .wait(555)
      .xclick('id("ModuleContainer")//a[.="Users"]')
      .wait(555)
      .xclick('id("ModuleContainer")//a[.="Patron groups"]')
      .wait(555)
      .xclick('//li[@data-id="' + communityid + '"]//button[.="Delete"]')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    }) 
    it('should confirm that "Community" patron group has been deleted', done => {
      nightmare
      .wait(555)
      .evaluate(function(communityid) {
        var cnode = document.querySelector('li[data-id="' + communityid + '"]')
	if (cnode) {
	  throw new Error('Community patron group found after clicking "Delete" button!')
	}
      }, communityid)
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
      .then(result => { done() })
      .catch(done)
    }) 
    flogout();
  })
})
