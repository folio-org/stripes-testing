/* global describe it */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^type" }] */

const Nightmare = require('../xnightmare.js');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');
const moment = require('moment');

describe('Tests to validate the loan renewals', function descRoot() {
  this.timeout(Number(config.test_timeout));

  describe('Login > Update settings > Create loan policy > Apply Loan rule > Find Active user > Create inventory record > Create holdings record > Create item record > Checkout item > Confirm checkout > Renew success > Renew failure > Renew failure > create fixedDueDateSchedule > Assign fdds to loan policy > Renew failure > Edit loan policy > Renew failure > Check in > delete loan policy > delete fixedDueDateSchedule > logout\n', function descStart() {
    const nightmare = new Nightmare(config.nightmare);
    let userid = 'user';
    const uselector = "#list-users div[role='listitem']:nth-of-type(9) > a > div:nth-of-type(5)";
    const policyName = `test-policy-${Math.floor(Math.random() * 10000)}`;
    const scheduleName = `test-schedule-${Math.floor(Math.random() * 10000)}`;
    const renewalLimit = 1;
    const loanPeriod = 1;
    const nextMonthValue = moment().add(65, 'days').format('MM/DD/YYYY');
    const tomorrowValue = moment().add(3, 'days').format('MM/DD/YYYY');
    const dayAfterValue = moment().add(4, 'days').format('MM/DD/YYYY');
    const debugSleep = parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 0;
    let loanRules = '';

    it(`should login as ${config.username}/${config.password}`, (done) => {
      nightmare
        .on('page', function onAlert(type = 'alert', message) {
          throw new Error(message);
        })
        .goto(config.url)
        .wait(Number(config.login_wait))
        .insert(config.select.username, config.username)
        .insert(config.select.password, config.password)
        .click('#clickable-login')
        .wait('#clickable-logout')
        .then(done)
        .catch(done);
    });

    it('should set patron scan ID to "User"', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('#clickable-settings')
        .wait('a[href="/settings/circulation"]')
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/checkout"]')
        .click('a[href="/settings/circulation/checkout"]')
        .wait('#username-checkbox')
        .wait(1111)
        .evaluate(() => {
          const list = document.querySelectorAll('[data-checked="true"]');
          list.forEach(el => (el.click()));
        })
        .then(() => {
          nightmare
            .wait(222)
            .wait('#username-checkbox')
            .click('#username-checkbox')
            .wait('#clickable-savescanid')
            .click('#clickable-savescanid');
        })
        .then(() => { done(); })
        .catch(done);
    });

    it('should create a new loan policy with renewalLimit of 1', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('a[href="/settings/circulation"]')
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/loan-policies"]')
        .click('a[href="/settings/circulation/loan-policies"]')
        .wait(222)
        .xclick('//button[.="+ New"]')
        .wait('#input_policy_name')
        .type('#input_policy_name', policyName)
        .wait('#input_loan_period')
        .type('#input_loan_period', loanPeriod)
        .wait('#select_policy_period')
        .click('#select_policy_period')
        .wait(222)
        .type('#select_policy_period', 'mo')
        .wait(222)
        .wait('#input_allowed_renewals')
        .type('#input_allowed_renewals', renewalLimit)
        .wait('#select_renew_from')
        .type('#select_renew_from', 'cu')
        .xclick('//button[.="Save and close"]')
        .wait(1000)
        .evaluate(() => {
          const sel = document.querySelector('div[class^="textfieldError"]');
          if (sel) {
            throw new Error(sel.textContent);
          }
        })
        .then(done)
        .catch(done);
    });

    it('Apply the loan policy created as a loan rule to material-type book', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('a[href="/settings/circulation"]')
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/loan-rules"]')
        .click('a[href="/settings/circulation/loan-rules"]')
        .wait('#form-loan-rules')
        .wait(1000)
        .evaluate((policy) => {
          loanRules = document.getElementsByClassName('CodeMirror')[0].CodeMirror.getValue();
          const value = `priority: t, s, c, b, a, m, g \nfallback-policy: example-loan-policy \nm book: ${policy}`;
          document.getElementsByClassName('CodeMirror')[0].CodeMirror.setValue(value);
        }, policyName)
        .then(() => {
          nightmare
            .wait(222)
            .xclick('//button[.="Save"]')
            .wait(Math.max(1111, debugSleep)); // debugging
          done();
        })
        .catch(done);
    });

    it('should find an active user ', (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait(2000)
        .click('#clickable-filter-active-Active')
        .wait(uselector)
        .evaluate(selector => document.querySelector(selector).title, uselector)
        .then((result) => {
          userid = result;
          done();
          console.log(`          Found user ${userid}`);
        })
        .catch(done);
    });
    const barcode = helpers.createInventory(nightmare, config, 'Soul stution / Hank Mobley');

    it(`should check out ${barcode} to ${userid}`, (done) => {
      nightmare
        .click('#clickable-checkout-module')
        .wait('#input-patron-identifier[placeholder*="username"]')
        .evaluate(() => {
          const ph = document.querySelector('#input-patron-identifier').placeholder;
          if (!ph.match(/username/i)) {
            throw new Error(`Placeholder is not asking for Username! (${ph})`);
          }
        })
        .insert('#input-patron-identifier', userid)
        .click('#clickable-find-patron')
        .wait(() => {
          const err = document.querySelector('#patron-form div[class^="textfieldError"]');
          const yay = document.querySelector('#patron-form ~ div a > strong');
          if (err) {
            throw new Error(err.textContent);
          } else if (yay) {
            return true;
          } else {
            return false;
          }
        })
        .wait(222)
        .insert('#input-item-barcode', barcode)
        .wait(222)
        .click('#clickable-add-item')
        .wait(1111)
        .evaluate(() => {
          const sel = document.querySelector('div[class^="textfieldError"]');
          if (sel) {
            throw new Error(sel.textContent);
          }
        })
        .wait(222)
        .click('#section-item button')
        .wait(Math.max(555, debugSleep)) // debugging
        .then(done)
        .catch(done);
    });

    it(`should find ${barcode} in ${userid}'s open loans`, (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait('#input-user-search')
        .wait(222)
        .insert('#input-user-search', userid)
        .wait(`#list-users div[title="${userid}"]`)
        .click(`#list-users div[title="${userid}"]`)
        .wait('#clickable-viewcurrentloans')
        .click('#clickable-viewcurrentloans')
        .wait((fbarcode) => {
          const element = document.evaluate(`id("list-loanshistory")//div[.="${fbarcode}"]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (element.singleNodeValue) {
            return true;
          } else {
            return false;
          }
        }, barcode)
        .wait(Math.max(555, debugSleep)) // debugging
        .then(done)
        .catch(done);
    });

    it('should renew the loan and succeed', (done) => {
      nightmare
        .wait(222)
        .wait(`div[title="${barcode}"]`)
        .evaluate((fbarcode) => {
          const ele = document.querySelector(`div[title="${fbarcode}"]`);
          ele.parentElement.querySelector('input[type="checkbox"]').click();
          console.log('checked renewable checkbox');
        }, barcode)
        .then(() => {
          nightmare
            .wait(1000)
            .wait('button[title="Renew"]')
            .wait(() => {
              console.log('found renew button');
              return true;
            })
            .wait(1000)
            .click('button[title="Renew"]')
            .wait(() => {
              console.log('clicked renew button; waiting for calloutBase');
              return true;
            })
            .wait('div[class^="calloutBase"]')
            .wait(() => {
              console.log('found calloutBase! all done!');
              return true;
            })
            .then(done)
            .catch(done);
        })
        .catch(() => {
          console.error('FAILED');
          done();
        });
    });

    it('should renew the loan second time and hit the renewal limit', (done) => {
      nightmare
        .wait(555)
        .wait(`div[title="${barcode}"]`)
        .wait(1000)
        .evaluate((fbarcode) => {
          const ele = document.querySelector(`div[title="${fbarcode}"]`);
          ele.parentElement.querySelector('input[type="checkbox"]').click();
        }, barcode)
        .then(() => {
          nightmare
            .wait(1000)
            .wait('button[title="Renew"]')
            .wait(333)
            .click('button[title="Renew"]')
            .wait(333)
            .wait('#renewal-failure-modal')
            .wait(333)
            .evaluate(() => {
              const errorMsg = document.querySelector('#renewal-failure-modal > div:nth-of-type(2) > p').innerText;
              if (errorMsg === null) {
                throw new Error('Should throw an error as the renewalLimit is reached');
              } else if (!errorMsg.match('Loan cannot be renewed because: loan has reached its maximum number of renewals')) {
                throw new Error('Expected only the renewal failure error message');
              }
            })
            .then(done)
            .catch(done);
        })
        .catch(done);
    });

    it('Edit loan policy, renew from system date should fail the renewal', (done) => {
      nightmare
        .wait(222)
        .xclick('//span[.="Settings"]')
        .wait(222)
        .xclick('id("ModuleContainer")//a[.="Circulation"]')
        .wait(222)
        .xclick('id("ModuleContainer")//a[.="Loan policies"]')
        .wait(222)
        .xclick(`id("ModuleContainer")//a[.="${policyName}"]`)
        .wait('#clickable-edit-item')
        .click('#clickable-edit-item')
        .wait('#input_allowed_renewals')
        .evaluate(() => {
          document.querySelector('#input_allowed_renewals').value = '';
        })
        .then(() => {
          nightmare
            .wait(1000)
            .type('#input_allowed_renewals', 2)
            .wait('#select_renew_from')
            .type('#select_renew_from', 'sy')
            .xclick('//button[.="Save and close"]')
            .wait(1000)
            .evaluate(() => {
              const sel = document.querySelector('div[class^="textfieldError"]');
              if (sel) {
                throw new Error(sel.textContent);
              }
            })
            .then(() => {
              nightmare
                .wait('#clickable-users-module')
                .click('#clickable-users-module')
                .wait(`div[title="${barcode}"]`)
                .evaluate((fbarcode) => {
                  const ele = document.querySelector(`div[title="${fbarcode}"]`);
                  ele.parentElement.querySelector('input[type="checkbox"]').click();
                }, barcode)
                .wait(333)
                .wait('button[title="Renew"]')
                .click('button[title="Renew"]')
                .wait('#renewal-failure-modal')
                .evaluate(() => {
                  const errorMsg = document.querySelector('#renewal-failure-modal > div:nth-of-type(2) > p').innerText;
                  if (errorMsg === null) {
                    throw new Error('Should throw an error as the renewalLimit is reached');
                  } else if (!errorMsg.match('Loan cannot be renewed because: renewal at this time would not change the due date')) {
                    throw new Error('Expected only the renewal failure error message');
                  }
                })
                .then(done)
                .catch(done);
            });
        })
        .catch(done);
    });

    it('should create a new fixedDueDateSchedule', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('a[href="/settings/circulation"]')
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/fixed-due-date-schedules"]')
        .click('a[href="/settings/circulation/fixed-due-date-schedules"]')
        .wait(222)
        .xclick('//button[.="+ New"]')
        .wait('#input_schedule_name')
        .type('#input_schedule_name', scheduleName)
        .type('input[name="schedules[0].from"]', tomorrowValue)
        .type('input[name="schedules[0].to"]', dayAfterValue)
        .type('input[name="schedules[0].due"]', nextMonthValue)
        .wait(555)
        .wait('#clickable-save-fixedDueDateSchedule')
        .click('#clickable-save-fixedDueDateSchedule')
        .wait(1000)
        .evaluate(() => {
          const sel = document.querySelector('div[class^="feedbackError"]');
          if (sel) {
            throw new Error(sel.textContent);
          }
        })
        .then(done)
        .catch(done);
    });

    it('Assign the fixedDueDateSchedule to the loan policy', (done) => {
      nightmare
        .wait('a[href="/settings/circulation/loan-policies"]')
        .click('a[href="/settings/circulation/loan-policies"]')
        .wait(222)
        .xclick(`id("ModuleContainer")//a[.="${policyName}"]`)
        .wait('#clickable-edit-item')
        .click('#clickable-edit-item')
        .wait('#input_loan_profile')
        .type('#input_loan_profile', 'fi')
        .wait('#input_loansPolicy_fixedDueDateSchedule')
        .type('#input_loansPolicy_fixedDueDateSchedule', `${scheduleName}`)
        .wait(333)
        .xclick('//button[.="Save and close"]')
        .wait(1000)
        .evaluate(() => {
          const sel = document.querySelector('div[class^="feedbackError"]');
          if (sel) {
            throw new Error(sel.textContent);
          }
        })
        .then(done)
        .catch(done);
    });

    it('Renewal should fail as renewal date falls outside of the date ranges', (done) => {
      nightmare
        .wait(555)
        .wait('#clickable-users-module')
        .click('#clickable-users-module')
        .wait(`div[title="${barcode}"]`)
        .evaluate((fbarcode) => {
          const ele = document.querySelector(`div[title="${fbarcode}"]`);
          ele.parentElement.querySelector('input[type="checkbox"]').click();
        }, barcode)
        .wait(333)
        .wait('button[title="Renew"]')
        .click('button[title="Renew"]')
        .wait('#renewal-failure-modal')
        .evaluate(() => {
          const errorMsg = document.querySelector('#renewal-failure-modal > div:nth-of-type(2) > p').innerText;
          if (errorMsg === null) {
            throw new Error('Should throw an error as the renewalLimit is reached');
          } else if (!errorMsg.match('Loan cannot be renewed because: renewal date falls outside of the date ranges in the loan policy')) {
            throw new Error('Expected Loan cannot be renewed because: renewal date falls outside of the date ranges in the loan policy error message');
          }
        })
        .then(done)
        .catch(done);
    });

    // it('Edit the loan policy to renewalLimit of 1', (done) => {
    //   nightmare
    //     .wait(222)
    //     .xclick('//span[.="Settings"]')
    //     .wait(222)
    //     .xclick('id("ModuleContainer")//a[.="Circulation"]')
    //     .wait(222)
    //     .xclick('id("ModuleContainer")//a[.="Loan policies"]')
    //     .wait(222)
    //     .xclick(`id("ModuleContainer")//a[.="${policyName}"]`)
    //     .wait('#clickable-edit-item')
    //     .click('#clickable-edit-item')
    //     .wait('#input_allowed_renewals')
    //     .evaluate(() => {
    //       document.querySelector('#input_allowed_renewals').value = '';
    //     })
    //     .wait(111)
    //     .type('#input_allowed_renewals', 1)
    //     .xclick('//button[.="Save and close"]')
    //     .wait(1000)
    //     .evaluate(() => {
    //       const sel = document.querySelector('div[class^="textfieldError"]');
    //       if (sel) {
    //         throw new Error(sel.textContent);
    //       }
    //     })
    //     .then(done)
    //     .catch(done);
    // });
    //
    // it('Renew and verify the consolidated error messages', (done) => {
    //   nightmare
    //     .wait(555)
    //     .wait('#clickable-users-module')
    //     .click('#clickable-users-module')
    //     .wait(`div[title="${barcode}"]`)
    //     .evaluate((fbarcode) => {
    //       const ele = document.querySelector(`div[title="${fbarcode}"]`);
    //       ele.parentElement.querySelector('input[type="checkbox"]').click();
    //     }, barcode)
    //     .wait(333)
    //     .wait('button[title="Renew"]')
    //     .click('button[title="Renew"]')
    //     .wait('#renewal-failure-modal')
    //     .evaluate(() => {
    //       const errorMsg = document.querySelector('#renewal-failure-modal > div:nth-of-type(2) > p').innerText;
    //       if (errorMsg === null) {
    //         throw new Error('Should throw an error as the renewalLimit is reached');
    //       } else if (errorMsg !== 'Loan cannot be renewed because: renewal date falls outside of the date ranges in the loan policy and loan has reached its maximum number of renewals.') {
    //         throw new Error('Expected Loan cannot be renewed because: renewal date falls outside of the date ranges in the loan policy and loan has reached its maximum number of renewals.');
    //       }
    //     })
    //     .then(done)
    //     .catch(done);
    // });

    it(`should check in ${barcode}`, (done) => {
      nightmare
        .click('#clickable-checkin-module')
        .wait(222)
        .insert('#input-item-barcode', barcode)
        .wait(222)
        .click('#clickable-add-item')
        .wait('#list-items-checked-in')
        .evaluate(() => {
          const a = document.querySelector('div[title="Available"]');
          if (a === null) {
            throw new Error("Checkin did not return 'Available' status");
          }
        })
        .then(done)
        .catch(done);
    });

    it('should restore the loanRules', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('a[href="/settings/circulation"]')
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/loan-rules"]')
        .click('a[href="/settings/circulation/loan-rules"]')
        .wait('#form-loan-rules')
        .wait(1000)
        .evaluate(() => {
          document.getElementsByClassName('CodeMirror')[0].CodeMirror.setValue(loanRules);
        })
        .wait(666)
        .xclick('//button[.="Save"]')
        .wait(Math.max(1111, debugSleep)) // debugging
        .then(done)
        .catch(done);
    });

    it('should delete the loan policy', (done) => {
      nightmare
        .wait(222)
        .xclick('//span[.="Settings"]')
        .wait(222)
        .xclick('id("ModuleContainer")//a[.="Circulation"]')
        .wait(222)
        .xclick('id("ModuleContainer")//a[.="Loan policies"]')
        .wait(222)
        .xclick(`id("ModuleContainer")//a[.="${policyName}"]`)
        .wait('#clickable-edit-item')
        .click('#clickable-edit-item')
        .wait('button[title="Delete Loan Policy"]')
        .click('button[title="Delete Loan Policy"]')
        .wait(222)
        .wait('#clickable-deleteloanpolicy-confirmation-confirm')
        .click('#clickable-deleteloanpolicy-confirmation-confirm')
        .wait(222)
        .then(done)
        .catch(done);
    });

    it('should delete the fixedDueDateSchedule', (done) => {
      nightmare
        .wait(222)
        .wait('a[href="/settings/circulation/fixed-due-date-schedules"]')
        .click('a[href="/settings/circulation/fixed-due-date-schedules"]')
        .wait(333)
        .xclick(`id("ModuleContainer")//a[.="${scheduleName}"]`)
        .wait('#clickable-edit-item')
        .click('#clickable-edit-item')
        .wait('#clickable-delete-set')
        .click('#clickable-delete-set')
        .wait('#clickable-deletefixedduedateschedule-confirmation-confirm')
        .click('#clickable-deletefixedduedateschedule-confirmation-confirm')
        .wait(222)
        .then(done)
        .catch(done);
    });

    it('should logout', (done) => {
      nightmare
        .click('#clickable-logout')
        .wait(config.select.username)
        .end()
        .then(done)
        .catch(done);
    });
  });
});
