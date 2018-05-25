/* global it describe */

/*
 test for location setup
 1) click settings
 2) click organization
 3) create an institution
 4) create a campus attached to the above institution
 5) create a library at the above campus
 6) add a location to the above library
 7) clean up new settings
*/

const Nightmare = require('nightmare');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe('Load test-location', function runMain() {
  this.timeout(Number(config.test_timeout));
  const nightmare = new Nightmare(config.nightmare);
  // location constants
  const institutionName = 'The University of The West Indies';
  const institutionCode = 'UWI';
  const campusName = 'St Augustine';
  const campusCode = 'STA';
  const libraryName = 'The Alma Jordan Library';
  const libraryCode = 'AJL';
  let institutionUUID = '';
  let campusUUID = '';

  // selectors
  const institutionNameSelector = `div[role="gridcell"][title="${institutionName}"]`;
  const campusNameSelector = `div[role="gridcell"][title="${campusName}"]`;
  const libraryNameSelector = `div[role="gridcell"][title="${libraryName}"]`;

  describe('Login > Settings > Organisation > Create Institutions > Confirm Creation > Create Campus > Confirm Creation > Create Library > Confirm Creation > Remove Library, Campus, Institution > Confirm Removal > Logout\n', () => {
    it(`should login as ${config.username}/${config.password}`, (done) => {
      helpers.login(nightmare, config, done);
    });

    it('it should click on settings and organisation', (done) => {
      nightmare
        /* .on('console', (log, msg) => {
          console.log(msg);
        }) */
        .click('#clickable-settings')
        .wait('#ModuleContainer')
        .click('div[role="presentation"] a[href="/settings/organization"]')
        .wait(999)
        .then(() => { done(); })
        .catch(done);
    });

    it('it should create an institution', (done) => {
      nightmare
        .wait('a[href="/settings/organization/location-institutions"]')
        .click('a[href="/settings/organization/location-institutions"]')
        .wait(999)
        .wait('#clickable-add-institutions')
        .click('#clickable-add-institutions')
        .wait('input[name="items[0].name"]')
        .type('input[name="items[0].name"]', institutionName)
        .wait('input[name="items[0].code"]')
        .type('input[name="items[0].code"]', institutionCode)
        .wait('#clickable-save-institutions-0')
        .click('#clickable-save-institutions-0')
        .wait(999)
        .then(() => { done(); })
        .catch(done);
    });

    it('it should confirm institution created', (done) => {
      nightmare
        .evaluate((instName, instNameSelector) => {
          // each institution in an div.editListRow class
          let found = false;
          const container = document.querySelector('#editList-institutions');
          if (container !== null) {
            const list = document.querySelectorAll('#editList-institutions>div:nth-of-type(2)>div');
            console.log(list.length);
            list.forEach((currentValue) => {
              const row = currentValue.querySelector(instNameSelector);
              if (row !== null) {
                console.log(row.title);
                if (row.title === instName) {
                  found = true;
                }
              }
            });
          }
          if (!found) {
            throw new Error('Institution not created');
          }
        }, institutionName, institutionNameSelector)
        .then(() => { done(); })
        .catch(done);
    });

    it('it should create a campus', (done) => {
      nightmare
        .wait('a[href="/settings/organization/location-campuses"]')
        .click('a[href="/settings/organization/location-campuses"]')
        .wait(3333)
        .wait('#institutionSelect')
        .evaluate((instNameCode) => {
          console.log(instNameCode);
          let index = -1;
          let optValue = '';
          const selectOptions = document.querySelector('#institutionSelect').options;
          let i = 0;
          console.log(selectOptions.length);
          while (i < selectOptions.length) {
            if (selectOptions[i].text === instNameCode) {
              index = i;
              optValue = selectOptions[i].value;
              i = selectOptions.length;
            }
            i++;
          }
          if (index === -1) {
            throw new Error('Add campus - institution not found in list');
          } else {
            return optValue;
          }
        }, `${institutionName} (${institutionCode})`)
        .then((optValue) => { institutionUUID = optValue; })
        .then(() => {
          nightmare
            .wait('#institutionSelect')
            .select('#institutionSelect', institutionUUID)
            .wait('#clickable-add-patrongroups')
            .click('#clickable-add-patrongroups')
            .wait('input[name="items[0].name"]')
            .type('input[name="items[0].name"]', campusName)
            .wait('input[name="items[0].code"]')
            .type('input[name="items[0].code"]', campusCode)
            .click('#clickable-save-patrongroups-0')
            .wait(999);
        })
        .then(() => { done(); })
        .catch(done);
    });

    it('it should confirm campus created', (done) => {
      nightmare
        .wait(999)
        .evaluate((campName, campNameSelector) => {
          let found = false;
          const container = document.querySelector('#editList-patrongroups');
          if (container !== null) {
            const list = document.querySelectorAll('#editList-patrongroups>div:nth-of-type(2)>div');
            console.log(list.length);
            list.forEach((currentValue) => {
              const row = currentValue.querySelector(campNameSelector);
              if (row !== null) {
                console.log(row.title);
                if (row.title === campName) {
                  found = true;
                }
              }
            });
          }
          if (!found) {
            throw new Error('Campus not created');
          }
        }, campusName, campusNameSelector)
        .then(() => { done(); })
        .catch(done);
    });

    it('it should create a library', (done) => {
      nightmare
        .wait('a[href="/settings/organization/location-libraries"]')
        .click('a[href="/settings/organization/location-libraries"]')
        .wait(3333)
        .wait('#institutionSelect')
        .select('#institutionSelect', institutionUUID)
        .wait('#campusSelect')
        .evaluate((campNameCode) => {
          console.log(campNameCode);
          let index = -1;
          let optValue = '';
          const selectOptions = document.querySelector('#campusSelect').options;
          let i = 0;
          while (i < selectOptions.length) {
            if (selectOptions[i].text === campNameCode) {
              index = i;
              optValue = selectOptions[i].value;
              i = selectOptions.length;
            }
            i++;
          }
          if (index === -1) {
            throw new Error('Add library - campus not found in list');
          } else {
            console.log(optValue);
            return optValue;
          }
        }, `${campusName} (${campusCode})`)
        .then((optValue) => { campusUUID = optValue; })
        .then(() => {
          nightmare
            .wait('#campusSelect')
            .select('#campusSelect', campusUUID)
            .wait('#clickable-add-patrongroups')
            .click('#clickable-add-patrongroups')
            .wait('input[name="items[0].name"]')
            .type('input[name="items[0].name"]', libraryName)
            .wait('input[name="items[0].code"]')
            .type('input[name="items[0].code"]', libraryCode)
            .click('#clickable-save-patrongroups-0')
            .wait(999);
        })
        .then(() => { done(); })
        .catch(done);
    });

    it('should confirm library created', (done) => {
      nightmare
        .evaluate((libName, libNameSelector) => {
          let found = false;
          const container = document.querySelector('#editList-patrongroups');
          if (container !== null) {
            const list = document.querySelectorAll('#editList-patrongroups>div:nth-of-type(2)>div');
            console.log(list.length);
            list.forEach((currentValue) => {
              const row = currentValue.querySelector(libNameSelector);
              if (row !== null) {
                console.log(row.title);
                if (row.title === libName) {
                  found = true;
                }
              }
            });
          }
          if (!found) {
            throw new Error('Library not created');
          }
        }, libraryName, libraryNameSelector)
        .then(() => { done(); })
        .catch(done);
    });

    // remove
    it('should remove library', (done) => {
      nightmare
        .wait('#editList-patrongroups')
        .evaluate((libName) => {
          let index = -1;
          let i = 0;
          const list = document.querySelectorAll('#editList-patrongroups>div:nth-of-type(2)>div');
          console.log(list.length);
          list.forEach((currentValue) => {
            const titleCol = currentValue.querySelector('div[role="gridcell"]:first-child');
            console.log(titleCol.title);
            if (titleCol.title === libName) {
              index = i;
            }
            i++;
          });
          if (index === -1) {
            throw new Error('Remove library - library not found');
          } else {
            document.querySelector(`#clickable-delete-patrongroups-${index}`).click();
          }
        }, libraryName)
        // wait for confirmation to appear
        .wait('#deletelibrary-confirmation-modal-heading')
        .click('#clickable-deletelibrary-confirmation-confirm')
        .wait(999)
        // confirm removal
        .evaluate((libName, libNameSelector) => {
          let found = false;
          const container = document.querySelector('#editList-patrongroups');
          if (container !== null) {
            const list = document.querySelectorAll('#editList-patrongroups>div:nth-of-type(2)>div');
            console.log(list.length);
            list.forEach((currentValue) => {
              const row = currentValue.querySelector(libNameSelector);
              if (row !== null) {
                console.log(row.title);
                if (row.title === libName) {
                  found = true;
                }
              }
            });
          }
          if (found) {
            throw new Error('Library has not been removed');
          }
        }, libraryName, libraryNameSelector)
        .then(() => { done(); })
        .catch(done);
    });

    it('it should remove campus', (done) => {
      nightmare
        .wait('a[href="/settings/organization/location-campuses"]')
        .click('a[href="/settings/organization/location-campuses"]')
        // select institution
        .wait('#institutionSelect')
        .select('#institutionSelect', institutionUUID)
        .wait('#editList-patrongroups')
        .evaluate((campName) => {
          let index = -1;
          let i = 0;
          const list = document.querySelectorAll('#editList-patrongroups>div:nth-of-type(2)>div');
          console.log(list.length);
          list.forEach((currentValue) => {
            const titleCol = currentValue.querySelector('div[role="gridcell"]:first-child');
            console.log(titleCol.title);
            if (titleCol.title === campName) {
              index = i;
            }
            i++;
          });
          if (index === -1) {
            throw new Error('Remove campus - campus not found');
          } else {
            document.querySelector(`#clickable-delete-patrongroups-${index}`).click();
          }
        }, campusName)
        // wait for modal
        .wait('#deletecampus-confirmation-modal')
        .click('#clickable-deletecampus-confirmation-confirm')
        .wait(999)
        // confirm removal
        .evaluate((campName, campNameSelector) => {
          let found = false;
          const list = document.querySelectorAll('#editList-patrongroups>div:nth-of-type(2)>div');
          console.log(list.length);
          list.forEach((currentValue) => {
            const row = currentValue.querySelector(campNameSelector);
            if (row !== null) {
              console.log(row.title);
              if (row.title === campName) {
                found = true;
              }
            }
          });
          if (found) {
            throw new Error('Campus not removed');
          }
        }, campusName, campusNameSelector)
        .then(() => { done(); })
        .catch(done);
    });

    it('should remove institution', (done) => {
      nightmare
        .wait('a[href="/settings/organization/location-institutions"]')
        .click('a[href="/settings/organization/location-institutions"]')
        .wait('#editList-institutions')
        .wait(999)
        .evaluate((instName) => {
          let index = -1;
          let i = 0;
          const list = document.querySelectorAll('#editList-institutions>div:nth-of-type(2)>div');
          console.log(list.length);
          list.forEach((currentValue) => {
            const titleCol = currentValue.querySelector('div[role="gridcell"]:first-child');
            console.log(titleCol.title);
            if (titleCol.title === instName) {
              index = i;
            }
            i++;
          });
          if (index === -1) {
            throw new Error('Remove institution - institution not found');
          } else {
            document.querySelector(`#clickable-delete-institutions-${index}`).click();
          }
        }, institutionName)
        .wait('#deleteinstitution-confirmation-modal')
        .click('#clickable-deleteinstitution-confirmation-confirm')
        .wait(999)
        // confirm removal
        .evaluate((instName, instNameSelector) => {
          let found = false;
          const list = document.querySelectorAll('#editList-institutions>div:nth-of-type(2)>div');
          console.log(list.length);
          list.forEach((currentValue) => {
            const row = currentValue.querySelector(instNameSelector);
            if (row !== null) {
              console.log(row.title);
              if (row.title === instName) {
                found = true;
              }
            }
          });
          if (found) {
            throw new Error('Institution not removed');
          }
        }, institutionName, institutionNameSelector)
        .then(() => { done(); })
        .catch(done);
    });

    it('should logout', (done) => {
      helpers.logout(nightmare, config, done);
    });
  });
});
