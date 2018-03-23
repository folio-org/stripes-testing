/* global it describe */

/*
 Test for Settings > Users > Profile Picture
 1) login
 2) click settings
 3) click users
 4) profile pictures
 5) click "Display profile pictures" checkbox
 6) click save
 7) load users modules (click "Users" at top of screen)
 8) click a user from the user list (center pane)
 9) confirm that the full user record in the third pane has 100 x 100 pixel image in the "User information" section.
 10) go back to profile picture settings and uncheck "Display profile pictures"
 11) go back to a user record an confirm that 100 x 100 pixel image is not present.
*/

const Nightmare = require('nightmare');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe('Load test-profilePictures', function runMain() {
  this.timeout(Number(config.test_timeout));

  const nightmare = new Nightmare(config.nightmare);
  const pageLoadPeriod = 2000;
  const actionLoadPeriod = 222;
  const imgWidth = 100;
  const imgHeight = 100;

  describe('Login > Settings > Enable Profile Pictures > Users > User Information has 100x100 px image > Disable Profile Pictures > Users > User Information does not have 100x100 px image > Logout\n', () => {
    it(`should login as ${config.username}/${config.password}`, (done) => {
      helpers.login(nightmare, config, done);
    });

    it('should enable profile pictures', (done) => {
      nightmare
        .on('console', (log, msg) => {
          console.log(msg);
        })
        .click('#clickable-settings')
        .wait(pageLoadPeriod)
        .click('a[href="/settings/users"]')
        .wait(actionLoadPeriod)
        .click('a[href="/settings/users/profilepictures"]')
        .wait(actionLoadPeriod)
        .evaluate(() => {
          const elem = document.querySelector('#profile_pictures');
          if (!elem.checked) {
            // not checked so check it and save
            // elem.checked = true;
            elem.click();
            document.querySelector('#clickable-save-config').disabled = false;
            document.querySelector('#clickable-save-config').click();
          }
        })
        // .click('#profile_pictures')
        // .wait('#clickable-save-config')
        // .click('#clickable-save-config')
        .wait(pageLoadPeriod)
        .then(() => { done(); })
        .catch(done);
    });

    it('should check picture present in user information', (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait('#Status-0')
        // check on active users filter
        .click('#clickable-filter-active-Active')
        .wait('#list-users')
        .click('#list-users div[role="listitem"]:first-of-type > a')
        .wait('#userInformationSection')
        .wait('#userInformationSection > div[role="tabpanel"] img')
        .evaluate((imgW, imgH) => {
          const imgElem = document.querySelector('#userInformationSection > div[role="tabpanel"] img');
          if (imgElem === null) {
            throw new Error('Image not being displayed');
          }
          console.log(imgElem.naturalWidth);
          console.log(imgElem.naturalHeight);
          if (imgElem.naturalWidth !== imgW && imgElem.naturalHeight !== imgH) {
            throw new Error('Image displayed does not have the correct dimensions');
          }
        }, imgWidth, imgHeight)
        .then(() => { done(); })
        .catch(done);
    });

    it('should disable profile pictures', (done) => {
      nightmare
        .click('#clickable-settings')
        .wait(pageLoadPeriod)
        // .click('a[href="/settings/users"]')
        // .wait(actionLoadPeriod)
        // .click('a[href="/settings/users/profilepictures"]')
        // .wait(actionLoadPeriod)
        .evaluate(() => {
          const elem = document.querySelector('#profile_pictures');
          if (elem.checked) {
            // checked so uncheck it and save
            // elem.checked = false;
            elem.click();
            document.querySelector('#clickable-save-config').disabled = false;
            document.querySelector('#clickable-save-config').click();
          }
        })
        .wait(pageLoadPeriod)
        .then(() => { done(); })
        .catch(done);
    });

    it('should check picture not present in user information', (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait('#users-module-display')
        // check on active users filter
        .check('#clickable-filter-active-Active')
        .wait('#list-users')
        .click('#list-users div[role="listitem"]:first-of-type > a')
        .wait('#userInformationSection')
        .evaluate(() => {
          const img = document.querySelector('#userInformationSection > div[role="tabpanel"] img');
          if (img !== null) {
            throw new Error('Image is being displayed');
          }
        })
        .then(() => { done(); })
        .catch(done);
    });

    it('should logout', (done) => {
      helpers.logout(nightmare, config, done);
    });
  });
});
