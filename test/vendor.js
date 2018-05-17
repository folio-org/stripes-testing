/* global it describe */

/*
 Test for vendor module
 1) creates a new vendor
 2) confirms creation
 3) edits new vendor
 4) confirms changes
 5) deletes new vendor

 vendor information - complete? or basic?
*/

const Nightmare = require('nightmare');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe('Load test-vendor', function runMain() {
  this.timeout(Number(config.test_timeout));
  // vendor constants
  const nightmare = new Nightmare(config.nightmare);
  const vendorName = 'GOBI';
  const newVendorName = 'GOBI Library Solutions';
  const vendorCode = 'GOBI';
  const vendorStatus = 'active';
  const vendorLang = 'en-us';
  const vendorDesc = 'GOBI Library Solutions from EBSCO (formerly YBP Library Services) provides acquisition, collection development and technical services to academic and research libraries around the world';

  // selector constants
  const vendorListSelector = 'div[role="listitem"]';
  const vendorNameSelector = `div[role="gridcell"][title="${vendorName}"]`;
  const vendorNewNameSelector = `div[role="gridcell"][title="${newVendorName}"]`;

  describe(`(${config.url}) Login > Vendors > Add Vendor > Confirm Creation > Edit New Vendor > Confirm Changes > Deletes New Vendor > Confirm > Logout\n`, () => {
    it(`should login as ${config.username}/${config.password}`, (done) => {
      helpers.login(nightmare, config, done);
    });

    it('should click on vendors module', (done) => {
      nightmare
      /* .on('console', (log, msg) => {
      console.log(msg)
     }) */
        .click('#clickable-vendors-module')
        .wait('#clickable-newvendors')
        .then(() => { done(); })
        .catch(done);
    });

    it('should add a vendor', (done) => {
      nightmare
        .click('#clickable-newvendors')
        .wait('#form-add-new-vendor')
      // populate form
        .insert('#name', vendorName)
        .insert('#code', vendorCode)
        .insert('#description', vendorDesc)
        .select('#vendor_status', vendorStatus)
        .select('#language', vendorLang)
      // vendor names
        .wait('#clickable-createnewvendor')
        .click('#clickable-createnewvendor')
        .wait(555)
        .then(() => { done(); })
        .catch(done);
    });

    it('should confirm vendor created and edit the vendor', (done) => {
      nightmare
        .wait('#clickable-newvendors')
        .evaluate((vendListSelector, vendNameSelector, vendName) => {
          let found = false;
          const matches = document.querySelectorAll(vendListSelector);
          console.log(matches.length);
          matches.forEach((currentValue) => {
            // get divs in this listitem
            const row = currentValue.querySelector(vendNameSelector);
            if (row !== null) {
              console.log(row.title);
              if (row.title === vendName) {
                found = true;
                currentValue.click(); // bring up the details view
              }
            }
          });
          if (!found) {
            throw new Error('Vendor not created');
          }
        }, vendorListSelector, vendorNameSelector, vendorName)
      // edit the vendor, open the vendor form
        .wait('#clickable-editvendor')
        .click('#clickable-editvendor')
        .wait('#form-add-new-vendor')
      // change the vendor name
        .insert('#name', '') // clear existing value
        .insert('#name', newVendorName)
        .wait('#clickable-updatevendor')
        .click('#clickable-updatevendor')
        .wait(999)
        .then(() => { done(); })
        .catch(done);
    });

    it('should confirm the edit and remove the vendor', (done) => {
      nightmare
        .wait(vendorListSelector)
        .evaluate((vendListSelector, vendNameSelector, vendName) => {
          let found = false;
          const matches = document.querySelectorAll(vendListSelector);
          console.log(matches.length);
          matches.forEach((currentValue) => {
            // get divs in this listitem
            const row = currentValue.querySelector(vendNameSelector);
            if (row !== null) {
              console.log(row.title);
              if (row.title === vendName) {
                found = true;
                currentValue.click(); // bring up the details view
              }
            }
          });
          if (!found) {
            throw new Error('Edited vendor name not found');
          }
        }, vendorListSelector, vendorNewNameSelector, newVendorName)
      // open the edit form
        .wait('#clickable-editvendor')
        .click('#clickable-editvendor')
        .wait('#form-add-new-vendor > div:nth-child(3) > div > button > span')
      /* get the remove button and click
        .evaluate(() => {
          const removeButton = document.querySelector('#form-edit-vendor>section>div>button[role="button"]>span');
          if (removeButton !== null && removeButton.innerHTML === 'Remove') {
            removeButton.click();
          }
          const dialogButtons = document.querySelectorAll('#ModuleContainer>div[role="dialog"]>div[role="document"] button[role="button"]>span');
          dialogButtons.forEach((currentValue) => {
            if (currentValue.innerHTML === 'Remove') {
              currentValue.click();
            }
          });
        }) */
        .click('#form-add-new-vendor > div:nth-child(3) > div > button > span')
        // .wait(3333)
        .then(() => { done(); })
        .catch(done);
    });

    it('should confirm the vendor has been deleted', (done) => {
      nightmare
      // list can be empty or has other items, #list-multilist is defined in that case
        .evaluate((vendListSelector, vendNameSelector, vendName) => {
          const vendorList = document.querySelector('#list-multilist');
          if (vendorList !== null) {
            // some vendors present so check that the one just deleted not present
            let found = false;
            const matches = document.querySelectorAll(vendListSelector);
            matches.forEach((currentValue) => {
              const row = currentValue.querySelector(vendNameSelector);
              if (row !== null && row.title === vendName) {
                found = true;
              }
            });

            if (found) {
              throw new Error('The vendor has not been deleted');
            }
          }
        }, vendorListSelector, vendorNewNameSelector, newVendorName)
        .then(() => { done(); })
        .catch(done);
    });

    it('should logout', (done) => {
      helpers.logout(nightmare, config, done);
    });
  });
});

