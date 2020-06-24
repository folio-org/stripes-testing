/* global it */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^type" }] */
module.exports.login = (nightmare, config, done, un, pw) => {
  nightmare
    .on('page', (type = 'alert', message) => {
      throw new Error(message);
    })
    .goto(config.url)
    // .wait(Number(config.login_wait))
    .wait(config.select.username)
    .insert(config.select.username, (un || config.username))
    .insert(config.select.password, (pw || config.password))
    .click('#clickable-login')
    .wait('#clickable-logout')
    .then(done)
    .catch(done);
};

module.exports.logout = (nightmare, config, done) => {
  nightmare
    .click('#clickable-logout') // logout
    .wait('#clickable-login') // login page
    .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep / 3, 10) : 0) // debugging
    .end()
    .then(done)
    .catch(done);
};
module.exports.logoutWithoutEnd = (nightmare, config, done) => {
  nightmare
    .click('#clickable-logout') // logout
    .wait('#clickable-login') // login page
    .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep / 3, 10) : 0) // debugging
    .then(done)
    .catch(done);
};
module.exports.openApp = (nightmare, config, done, app, testVersion) => function opena() {
  nightmare
    .wait(`#app-list-item-clickable-${app}-module`)
    .click(`#app-list-item-clickable-${app}-module`)
    .wait(`#${app}-module-display`)
    .exists('#app-list-dropdown-toggle[aria-expanded="true"]')
    .then(dropdownOpen => {
      return dropdownOpen ? nightmare.click('#app-list-dropdown-toggle').wait('#app-list-dropdown-toggle[aria-expanded="false"]') : nightmare.wait(0);
    })
    .then(() => {
      return nightmare
        .evaluate((mapp) => {
          const metadata = document.querySelector(`#${mapp}-module-display`);
          return {
            moduleName: metadata.getAttribute('data-module'),
            moduleVersion: metadata.getAttribute('data-version'),
          };
        }, app);
    })
    .then((meta) => {
      if (testVersion !== undefined) {
        console.log(`          Test suite   ${testVersion}`); // eslint-disable-line
        console.log(`          Live module  ${meta.moduleName}:${meta.moduleVersion} (${config.url})`); // eslint-disable-line
      }
      done();
      return meta;
    })
    .catch(done);
};

module.exports.getUsers = (nightmare, config, done) => function getu() {
  nightmare
    .click('#clickable-users-module')
    .wait('#clickable-filter-pg-faculty')
    .click('#clickable-filter-pg-faculty')
    .wait('#clickable-filter-pg-graduate')
    .click('#clickable-filter-pg-graduate')
    .wait('#clickable-filter-pg-staff')
    .click('#clickable-filter-pg-staff')
    .wait('#clickable-filter-pg-undergrad')
    .click('#clickable-filter-pg-undergrad')
    .wait('#list-users:not([data-total-count="0"])')
    .evaluate(() => {
      const udata = [];
      const users = document.querySelectorAll('#list-users div[role="row"]');
      for (let x = 0; x < users.length; x++) {
        const st = users[x].querySelector('div:nth-of-type(1)').innerText;
        const nm = users[x].querySelector('div:nth-of-type(2)').innerText;
        const bc = users[x].querySelector('div:nth-of-type(3)').innerText;
        const pg = users[x].querySelector('div:nth-of-type(4)').innerText;
        const id = users[x].querySelector('div:nth-of-type(5)').innerText;
        const em = users[x].querySelector('div:nth-of-type(6)').innerText;
        if (bc.match(/\d/)) {
          udata.push({ status: st, name: nm, barcode: bc, group: pg, id, email: em });
        }
      }
      return udata;
    })
    .then((u) => {
      done();
      return u;
    })
    .catch(done);
};

/**
 * create inventory, holdings, and item records. Return the item
 * record's barcode.
 */
module.exports.createInventory = (nightmare, config, title) => {
  return this.createNInventory(nightmare, config, title, 1)[0];
};

/**
 * create N items under a single inventory/holdings record.
 *
 * The guts of this function are a straigh copy-paste of createInventory,
 * above. It is
 *
 * @param title string the title to create
 * @param itemCount int the number of item records to create
 *
 * @return string[] array of barcodes of the created items
 */
module.exports.createNInventory = (nightmare, config, title, itemCount = 1) => {
  const barcodes = [];
  const ti = title || 'New test title';
  const expandedAccordionSelector = (expanded) => `section[class^=pane]:nth-of-type(3) section[class^=accordion] button[type=button][aria-expanded=${expanded ? 'true' : 'false'}]`;

  it('should create instance record', (done) => {
    nightmare
      .wait('#app-list-item-clickable-inventory-module')
      .click('#app-list-item-clickable-inventory-module')
      .wait('#clickable-newinventory')
      .click('#clickable-newinventory')
      .wait('#input_instance_title')
      .insert('#input_instance_title', ti)
      .wait('#select_instance_type')
      .wait(100)
      .type('#select_instance_type', 'o')
      .wait(100)
      .wait('#clickable-save-instance')
      .click('#clickable-save-instance')
      .wait(() => !document.querySelector('#clickable-save-instance'))
      .wait('#clickable-new-holdings-record')
      .waitUntilNetworkIdle(500)
      .then(done)
      .catch(done);
  });

  it('should create holdings record', (done) => {
    nightmare
      .wait('#clickable-new-holdings-record')
      .click('#clickable-new-holdings-record')
      .wait('#additem_permanentlocation')
      .wait(100)
      .type('#additem_permanentlocation', 'm')
      .wait(100)
      .wait('#additem_callnumber')
      .insert('#additem_callnumber', 'ZZ39.50')
      .wait('#clickable-create-holdings-record')
      .click('#clickable-create-holdings-record')
      .wait(() => !document.querySelector('#clickable-create-holdings-record'))
      .wait(expandedAccordionSelector(false))
      .then(done)
      .catch(done);
  });


  /**
   * There is quite a lot of interaction with non-required fields in the
   * following test. Why? Because it works, that's why. There are at least
   * two attributes of the new-item form that apparently make it special,
   * i.e. that make it a supergalactic pain in the ass.
   *     1. it uses on-blur validation for the barcode field
   *     2. it validates select elements in the validate function
   * That may not seem very special, but both cause problems for nightmare.
   *
   * It appears that a select element will only have its onBlur handler
   * fired if there is interaction with a non-select, non-button element
   * immediately following. Thus, the order of field interaction in this
   * test is quite specific.
   * See UIIN-671 for details.
   *
   * onBlur validation seems to throw Nightmare off into neverneverland.
   * Before the extra optional-field-button clicks were added, you could
   * seen an extra Electon instance appear and close when the test timed
   * out and failed. What's that all about? There are some actions that
   * seem to cause Nightmare to lose its context. Clicking through extra
   * fields, in particular, clicking on extra buttons, seems to restore
   * the context. Thus, the clicks on former-id and statistical-code,
   * while they appear purposeless since we don't actually add any data,
   * are in fact very deliberate: they pull Nightmare out of its slumber
   * and allow the final click on create-item to properly register.
   */
  for (let i = 0; i < itemCount; i++) {
    const barcode = `${new Date().valueOf()}${Math.floor(Math.random() * Math.floor(999999))}`;
    barcodes.push(barcode);

    it(`should create item record with barcode '${barcode}'`, (done) => {
      nightmare
        .exists(expandedAccordionSelector(false))
        .then(isClosed => {
          if (isClosed) {
            nightmare
              .click(expandedAccordionSelector(false))
              .wait(expandedAccordionSelector(true));
          }
        })
        .then(() => {
          nightmare
            .wait('button[id^=clickable-new-item]')
            .click('button[id^=clickable-new-item]')
            // Even though we wait for the #additem_barcode field to appear before
            // interacting with it, that's not enough. With only that precaution in
            // place, the first few characters of the barcode will occassionally be
            // lost, i.e given a value of 123456789, only 3456789 will be captured.
            // Adding a numeric timeout should be completely pointless given that we
            // have the selector-timeout, but it ain't. Go figure.
            .wait(1000)
            .wait('#additem_barcode')
            // Why, why `type` instead of `insert`? Why `type` in this, THE MOST
            // UNRELIABLE of tests? Because `insert` fails consistently, that's
            // why. Fails how? Like this: nothing happens, that's how. What do I
            // mean, "nothing"? NOTHING. NOTHING HAPPENS. You can log things with
            //    DEBUG=nightmare:actions*
            // to your pretty little heart's content and see the `insert` command
            // passes just fine, but if you watch carefully, about 20% of the time,
            // the barcode field will be empty afterward and then the item-id and
            // accession-number fields will populate with the same data, making
            // clear that the value is available but for some reason Nightmare
            // just didn't feel like using it.
            //
            // Am I bitter about this? Naw, I'm not bitter. Do I sound bitter?
            // I don't think I sound bitter. I THINK I SOUND KINDA PISSED OFF
            // because, you know what, I'm kinda pissed off.
            .type('#additem_barcode', barcode)
            // interaction with fields with on-blur handlers, like barcode,
            // MUST be followed by interaction with other fields in order to
            // trigger the blur event. some delay is necessary as well in
            // order to allow the event to trigger and complete.
            .wait(200)
            .wait('#additem_itemidentifier')
            .insert('#additem_itemidentifier', `iid-${barcode}`)
            .wait('#additem_materialType')
            .wait('#additem_loanTypePerm')
            .evaluate(() => {
              const node = Array.from(
                document.querySelectorAll('#additem_materialType option')
              ).find(e => e.text.startsWith('b'));
              if (node) {
                return node.value;
              } else {
                throw new Error('Could not find the ID for the materialType b...');
              }
            })
            .then((mtypeid) => {
              return nightmare
                .wait(`#additem_materialType option[value="${mtypeid}"]`)
                .select('#additem_materialType', mtypeid)
                // it is IMPERATIVE that interaction with a non-select component
                // immediately follows select(). See UIIN-671 for details.
                .wait('#additem_numberofpieces')
                .insert('#additem_numberofpieces', 1)
                .evaluate(() => {
                  const node = Array.from(
                    document.querySelectorAll('#additem_loanTypePerm option')
                  ).find(e => e.text.startsWith('C'));
                  if (node) {
                    return node.value;
                  } else {
                    throw new Error('Could not find the ID for the loanTypePerm C...');
                  }
                });
            })
            .then((ltypeid) => {
              nightmare
                .wait(`#additem_loanTypePerm option[value="${ltypeid}"]`)
                .wait(200)
                .select('#additem_loanTypePerm', ltypeid)
                // it is IMPERATIVE that interaction with a non-select component
                // immediately follows select(). See UIIN-671 for details.
                .wait('#additem_accessionnumber')
                .insert('#additem_accessionnumber', `an-${barcode}`)
                // click other things, because without these clicks,
                // the submit-button click never registers.
                .wait('#clickable-add-former-id')
                .click('#clickable-add-former-id')
                .wait('#clickable-add-statistical-code')
                .click('#clickable-add-statistical-code')
                .wait('#clickable-save-item')
                .click('#clickable-save-item')
                .wait(() => !document.querySelector('#clickable-save-item'))
                .wait('[id^=list-items-]')
                .wait(bc => {
                  return !!(Array.from(document.querySelectorAll('[id^=list-items-] [role=gridcell]'))
                    .find(e => `${bc}` === e.textContent)); // `${}` forces string interpolation for numeric barcodes
                }, barcode)
                .then(done)
                .catch(done);
            })
            .catch(done);
        });
    });
  }

  return barcodes;
};

module.exports.namegen = () => {
  const ts = new Date().valueOf();
  const fn = ['Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Liam', 'Noah', 'Mason', 'Lucas', 'Oliver'];
  const ln = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriquez', 'Wilson'];
  const ad = [{ city: 'Chicago', zip: '60609', address: '5 Wacker Dr', country: 'United States', state: 'IL', phone: '13125552121' },
    { city: 'New York', zip: '10002-2341', address: '425 Bowery', country: 'United States', state: 'NY', phone: '12125554444' },
    { city: 'San Francisco', zip: '94016', address: '39 Green Street', country: 'United States', state: 'CA', phone: '12153338888' },
    { city: 'København', zip: '1208', address: 'Nybrogade 30', country: 'Denmark', state: 'K', phone: '453332229999' }];
  const fnpos = Math.floor(Math.random() * fn.length);
  const lnpos = Math.floor(Math.random() * ln.length);
  const adpos = Math.floor(Math.random() * ad.length);
  const firstname = fn[fnpos];
  const lastname = ln[lnpos];
  return {
    id: firstname.substr(0, 1).toLowerCase() + lastname.toLowerCase() + ts,
    firstname,
    lastname,
    email: `${firstname.toLowerCase()}.${lastname.toLowerCase()}@someserver.org`,
    barcode: ts,
    password: 'P@$$w0rd23',
    address: ad[adpos],
  };
};

/**
 * Visit "settings > circulation > other settings" to tick the checkboxes
 * for "barcode" and "username".
 */
module.exports.circSettingsCheckoutByBarcodeAndUsername = (nightmare, config, done) => {
  nightmare
    .wait(config.select.settings)
    .click(config.select.settings)
    .wait('#app-list-item-clickable-settings')
    .wait('a[href="/settings/circulation"]')
    .click('a[href="/settings/circulation"]')
    .wait('a[href="/settings/circulation/checkout"]')
    .click('a[href="/settings/circulation/checkout"]')
    .wait('#username-checkbox')
    .wait(222)
    .evaluate(() => {
      const list = document.querySelectorAll('[data-checked="true"]');
      list.forEach(el => (el.click()));
    })
    .then(() => {
      nightmare
        .wait(222)
        .wait('#barcode-checkbox')
        .click('#barcode-checkbox')
        .wait('#username-checkbox')
        .click('#username-checkbox')
        .wait('#clickable-savescanid')
        .click('#clickable-savescanid')
        .then(done)
        .catch(done);
    });
};

/**
 * Visit "settings > tenant-settings > locale" and set the locale to
 * US-English and the timezone to America/New_York.
 */
module.exports.setUsEnglishLocale = (nightmare, config, done) => {
  nightmare
    .wait(config.select.settings)
    .click(config.select.settings)
    .wait('a[href="/settings/tenant-settings"]')
    .click('a[href="/settings/tenant-settings"]')
    .wait('a[href="/settings/tenant-settings/locale"]')
    .click('a[href="/settings/tenant-settings/locale"]')
    .wait('#locale')
    .select('#locale', 'en-US')
    .wait('#timezone')
    .select('#timezone', 'America/New_York')
    .wait(1000)
    .exists('#clickable-save-config[type=submit]:enabled')
    .then((hasChanged) => {
      if (hasChanged) {
        nightmare
          .click('#clickable-save-config')
          .wait('#clickable-save-config[type=submit]:disabled')
          // saving the locale has a 2s timout and we want to
          // make sure we wait for that to finish
          .wait(4000)
          .then(done)
          .catch(done);
      } else {
        done();
      }
    })
    .catch(done);
};

/**
 * Click the given app in the main-nav's application-list dropdown.
 * This may have the effect of expanding the dropdown, so we check for that
 * and close it if so.
 *
 * All apps are always listed on the dropdown, unlike the clickable-${app}-module
 * buttons which are only available for the first 12 apps in the platform's
 * stripes.config.js file.
 */
module.exports.clickApp = (nightmare, done, app, pause) => {
  nightmare
    .wait(pause || 0)
    .wait(`#app-list-item-clickable-${app}-module`)
    .click(`#app-list-item-clickable-${app}-module`)
    .wait(`#${app}-module-display`)
    .exists('#app-list-dropdown-toggle[aria-expanded="true"]')
    .then(dropdownOpen => {
      if (dropdownOpen) {
        return nightmare
          .click('#app-list-dropdown-toggle')
          .wait('#app-list-dropdown-toggle[aria-expanded="false"]');
      }
      return nightmare.wait(0);
    })
    .then(done)
    .catch(done);
};

/**
 * Click 'settings' in the main-nav's application-list dropdown.
 * This may have the effect of expanding the dropdown, so we check for that
 * and close it if so.
 *
 * Settings is always listed on the dropdown, unlike the clickable-settings
 * button which will not be instantiated if there are 12 or more apps
 * in the platform's stripes.config.js file that th
 */
const clickSettings = (nightmare, done, pause) => {
  nightmare
    .wait(pause || 0)
    .wait('#app-list-item-clickable-settings')
    .click('#app-list-item-clickable-settings')
    .exists('#app-list-dropdown-toggle[aria-expanded="true"]')
    .then(dropdownOpen => {
      return dropdownOpen ? nightmare.click('#app-list-dropdown-toggle').wait('#app-list-dropdown-toggle[aria-expanded="false"]') : nightmare.wait(0);
    })
    .then(done)
    .catch(done);
};

module.exports.clickSettings = clickSettings;


/**
 * Given a user object as returned from namegen(), instantiate a user
 * and grant check in and check out permission.
 */
module.exports.createUser = (nightmare, config, user) => {
  describe('should create a new user', () => {
    it('navigate to the new-user form', (done) => {
      nightmare
        .wait('#clickable-users-module')
        .click('#clickable-users-module')
        .wait('#input-user-search')
        .type('#input-user-search', '0')
        .wait('button[type=submit]')
        .click('button[type=submit]')
        .wait('#list-users div[role="row"] > a')
        .wait('#clickable-newuser')
        .click('#clickable-newuser')
        .then(done)
        .catch(done);
    });

    let gid;
    it('extract a patron-group value', (done) => {
      nightmare
        .wait('#adduser_group')
        .evaluate(() => {
          return Array.from(document.querySelector('#adduser_group').options).find(e => e.text.startsWith('faculty')).value;
        })
        .then((groupId) => {
          done();
          gid = groupId;
        });
    });

    it('create a user', (done) => {
      nightmare
        .wait('#adduser_lastname')
        .insert('#adduser_lastname', user.lastname)
        .wait('#adduser_firstname')
        .insert('#adduser_firstname', user.firstname)
        .wait('#adduser_barcode')
        .insert('#adduser_barcode', user.barcode)
        .wait('#adduser_group')
        .select('#adduser_group', gid)
        .wait('#useractive')
        .select('#useractive', 'true')
        .wait('#adduser_username')
        .insert('#adduser_username', user.id)
        .wait('#clickable-toggle-password')
        .click('#clickable-toggle-password')
        // It would be super-cool if the async username-blur validation
        // fired reliably in electron, but for some reason it doesn't,
        // which means waiting for the validation-success sometimes means
        // we wait forever. It _does_ fire reliably with a real browser.
        // .wait('#icon-adduser_username-validation-success')
        .wait(222)
        .wait('#pw')
        .insert('#pw', user.password)
        .wait('#adduser_email')
        .insert('#adduser_email', user.email)
        .wait('#adduser_dateofbirth')
        .insert('#adduser_dateofbirth', '05/04/1980')
        .wait('#adduser_enrollmentdate')
        .insert('#adduser_enrollmentdate', '01/01/2017')
        .wait('#adduser_expirationdate')
        .insert('#adduser_expirationdate', '01/01/2022')
        .wait('#clickable-createnewuser')
        .click('#clickable-createnewuser')
        .wait(() => {
          return !document.querySelector('#clickable-createnewuser');
        })
        .then(done)
        .catch(done);
    });

    it('verify new user exists', (done) => {
      nightmare
        .wait('#userInformationSection')
        .wait((uid) => {
          const us = document.querySelector('#extendedInfoSection');
          let bool = false;
          if (us.textContent.match(uid)) {
            bool = true;
          }
          return bool;
        }, user.id)
        .then(done)
        .catch(done);
    });

    const addPermission = (name) => {
      it(`add permission: ${name}`, (done) => {
        nightmare
          .wait('#clickable-edituser')
          .click('#clickable-edituser')
          .wait('#clickable-add-permission')
          .click('#clickable-add-permission')
          .wait('ul[class*="PermissionList"] li button')
          .evaluate((p) => {
            const i = Array.from(document.querySelectorAll('ul[class*="PermissionList"] li button')).findIndex(e => e.textContent === p);
            if (i >= 0) {
              return i + 1;
            }
            throw new Error(`Could not find the permission "${name}"`);
          }, name)
          .then((index) => {
            nightmare
              .click(`ul[class*="PermissionList"] li:nth-of-type(${index}) button`)
              .wait('#clickable-updateuser')
              .click('#clickable-updateuser')
              .wait(() => {
                return !document.querySelector('#clickable-updateuser');
              })
              .then(done)
              .catch(done);
          })
          .catch(done);
      });
    };

    addPermission('Check in: All permissions');
    addPermission('Check out: All permissions');
  });
};

/**
 * grant the requested permission to the user identified by barcode
 */
module.exports.grantPermission = (nightmare, config, barcode, permission) => {
  describe('grant permission to a user', () => {
    it(`find the user ${barcode}`, (done) => {
      nightmare
        .wait('#clickable-users-module')
        .click('#clickable-users-module')
        .wait('#input-user-search')
        .type('#input-user-search', barcode)
        .wait('button[type=submit]')
        .click('button[type=submit]')
        .wait('#list-users[data-total-count="1"] div[role="row"] > a')
        .click('#list-users[data-total-count="1"] div[role="row"] > a')
        .then(done)
        .catch(done);
    });

    it(`add permission: ${permission}`, (done) => {
      nightmare
        .wait('#clickable-edituser')
        .click('#clickable-edituser')
        .wait('#clickable-add-permission')
        .click('#clickable-add-permission')
        .wait('ul[class*="PermissionList"] li button')
        .evaluate((p) => {
          const i = Array.from(document.querySelectorAll('ul[class*="PermissionList"] li button')).findIndex(e => e.textContent === p);
          if (i >= 0) {
            return i + 1; // hooray for css 1-based selectors gag barf barf barf
          }
          throw new Error(`Could not find the permission "${p}"`);
        }, permission)
        .then((index) => {
          nightmare
            .click(`ul[class*="PermissionList"] li:nth-of-type(${index}) button`)
            .wait('#clickable-updateuser')
            .click('#clickable-updateuser')
            .wait(() => {
              return !document.querySelector('#clickable-updateuser');
            })
            .then(done)
            .catch(done);
        })
        .catch(done);
    });
  });
};

module.exports.checkout = (nightmare, done, itemBarcode, userBarcode) => {
  nightmare
    .wait('#input-patron-identifier')
    .insert('#input-patron-identifier', userBarcode)
    .wait('#clickable-find-patron')
    .click('#clickable-find-patron')
    .wait('#clickable-done')
    .wait(() => {
      const err = document.querySelector('#patron-form div[class^="textfieldError"]');
      if (err) {
        throw new Error(err.textContent);
      }
      return !!(document.querySelector('#patron-form ~ div a > strong'));
    })
    .wait('#input-item-barcode')
    .insert('#input-item-barcode', itemBarcode)
    .wait('#clickable-add-item')
    .click('#clickable-add-item')
    .wait('#list-items-checked-out')
    .wait(bc => {
      return !!(Array.from(document.querySelectorAll('#list-items-checked-out [role="row"] [role="gridcell"]'))
        .find(e => `${bc}` === e.textContent)); // `${}` forces string interpolation for numeric barcodes
    }, itemBarcode)
    .then(done)
    .catch(done);
};

/**
 * checkout multiple items to a given user
 *
 * NOTE: this function DOES NOT CALL done(); rather, it returns the
 * nightmare instance it received so the calling function can do that in
 * its own then() block.
 *
 * @itemBarcodeList string[] an array of barcodes
 * @userBarcode string a user barcode
 */
module.exports.checkoutList = (nightmare, itemBarcodeList, userBarcode) => {
  return nightmare
    .wait('#input-patron-identifier')
    .insert('#input-patron-identifier', userBarcode)
    .wait('#clickable-find-patron')
    .click('#clickable-find-patron')
    .wait('#clickable-done')
    .wait(() => {
      const err = document.querySelector('#patron-form div[class^="textfieldError"]');
      if (err) {
        throw new Error(err.textContent);
      }
      return !!(document.querySelector('#patron-form ~ div a > strong'));
    })
    .then(() => {
      itemBarcodeList.forEach((itemBarcode) => {
        nightmare
          .wait('#input-item-barcode')
          .insert('#input-item-barcode', itemBarcode)
          .wait('#clickable-add-item')
          .click('#clickable-add-item')
          .wait('#list-items-checked-out')
          .wait(bc => {
            return !!(Array.from(document.querySelectorAll('#list-items-checked-out [role="row"] [role="gridcell"]'))
              .find(e => `${bc}` === e.textContent)); // `${}` forces string interpolation for numeric barcodes
          }, itemBarcode);
      });
    });
};

/**
 * Visit Settings > Circulation > Circulation rules and save newRules
 * as the circulation rules, returning the old rules in a Promise that
 * may be resolved like so:

let cachedRules = '';
setCirculationRules(nightmare, rules)
  .then(oldRules => {
    cachedRules = oldRules;
  })
  .then(done)
  .catch(done);
});

 * If `done()` receives any arguments, it expects an error first. This means
 * if you want to ignore the return value from setCirculationRules in your
 * then() block, you need to explicitly configure it not to receive the value:

setCirculationRules(nightmare, cachedRules)
  .then(() => done())
  .catch(done);
});

 * calling .then(done) would implicitly pass the return value to done,
 * causing Nightmare to throw the error, "done() invoked with non-Error".
 */
module.exports.setCirculationRules = (nightmare, newRules) => {
  return nightmare
    .wait('a[href="/settings/circulation"]')
    .click('a[href="/settings/circulation"]')
    .wait('a[href="/settings/circulation/rules"]')
    .click('a[href="/settings/circulation/rules"]')
    .wait('#form-loan-rules')
    .wait('.CodeMirror')
    .evaluate((rules) => {
      const oldRules = document.getElementsByClassName('CodeMirror')[0].CodeMirror.getValue();
      document.getElementsByClassName('CodeMirror')[0].CodeMirror.setValue(rules);
      return oldRules;
    }, newRules)
    .then((rules) => {
      // it would be super cool if this part of the test would work like
      // every other test that assesses success by investigating #OverlayContainer
      // but for reasons I cannot fathom, waiting for that element here causes
      // it _not_ to appear. Hand to my heart I swear this is true. With a `wait()`
      // after clicking the button, the toast appears and slides away as expected.
      // But if you add a check like
      //   .wait(() => document.querySelector('#OverlayContainer div[class^="calloutBase"]'))
      // then the toast never appears. Really. It. Does. Not. Appear. WTAF?
      // We have Heisenberg toasts whose status is changed merely by trying to
      // observe them? Don't believe me? Try it yourself! Run the tests with
      // --show and witness the toast, then add the line above just below the
      // `click` and witness ... nothing. There will be nothing to witness
      // because the toast is now GONE. I don't care who took my cheese. But
      // who on earth is stealing my toast?!?!
      nightmare
        .wait('#clickable-save-loan-rules')
        .click('#clickable-save-loan-rules')
        .wait(1000);
      return rules;
    });
};


module.exports.findActiveUserBarcode = (nightmare, pg) => {
  return nightmare
    .wait('#clickable-reset-all')
    .click('#clickable-reset-all')
    .wait('[class^="noResultsMessageLabel"]')
    .wait('#clickable-filter-active-active')
    .click('#clickable-filter-active-active')
    .wait(() => {
      return Array.from(
        document.querySelectorAll('[class^="noResultsMessageLabel"]')
      ).length === 0;
    })
    .wait('#list-users[data-total-count]')
    .evaluate(() => document.querySelector('#list-users').getAttribute('data-total-count'))
    .then((result) => {
      return nightmare
        .wait(`#clickable-filter-pg-${pg}`)
        .click(`#clickable-filter-pg-${pg}`)
        .wait((activeCount) => document.querySelector('#list-users').getAttribute('data-total-count') !== activeCount, result)
        .wait('#list-users [data-row-index="row-2"]')
        .evaluate((patronGroupName) => {
          const ubc = [];
          const list = document.querySelectorAll('#list-users [role=rowgroup] [data-row-inner]');
          list.forEach((node) => {
            const status = node.querySelector('div:nth-child(1)').innerText;
            const barcode = node.querySelector('div:nth-child(3)').innerText;
            const patronGroup = node.querySelector('div:nth-child(4)').innerText;
            const un = node.querySelector('div:nth-child(5)').innerText;
            const nodeHref = node.href;
            if (patronGroup === patronGroupName && nodeHref && barcode && RegExp(/^\d+$/).test(barcode) && status.match(/Active/)) {
              const uuid = nodeHref.replace(/.+?([^/]+)\?.*/, '$1');
              ubc.push({
                barcode,
                uuid,
                username: un,
              });
            }
          });
          return ubc;
        }, pg)
        .then((userList) => {
          return userList[0].barcode;
        });
    });
};

// module.exports.foo = (nightmare) => {
//   const policyName = `test-policy-${Math.floor(Math.random() * 10000)}`;
//   const scheduleName = `test-schedule-${Math.floor(Math.random() * 10000)}`;
//   const noticePolicyName = `test-notice-policy-${Math.floor(Math.random() * 10000)}`;
//   const requestPolicyName = `test-request-policy-${Math.floor(Math.random() * 10000)}`;
// }

module.exports.addLoanPolicy = (nightmare, loanPolicyName, loanPeriod, renewalLimit) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should reach "Create loan policy" page', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/loan-policies"]')
      .click('a[href="/settings/circulation/loan-policies"]')
      .wait('#clickable-create-entry')
      .click('#clickable-create-entry')
      .then(done)
      .catch(done);
  });

  it(`should create a new loan policy (${loanPolicyName}) with renewalLimit of ${renewalLimit}`, (done) => {
    nightmare
      .wait('#input_policy_name')
      .type('#input_policy_name', loanPolicyName)
      .wait('#input_loan_profile')
      .select('#input_loan_profile', 'Rolling')
      .wait('input[name="loansPolicy.period.duration"')
      .type('input[name="loansPolicy.period.duration"', loanPeriod)
      .wait('select[name="loansPolicy.period.intervalId"]')
      .select('select[name="loansPolicy.period.intervalId"]', 'Minutes')
      .wait('select[name="loansPolicy.closedLibraryDueDateManagementId"]')
      .type('select[name="loansPolicy.closedLibraryDueDateManagementId"]', 'keep')
      .wait('#input_allowed_renewals')
      .type('#input_allowed_renewals', renewalLimit)
      .wait('#select_renew_from')
      .type('#select_renew_from', 'cu')
      .wait('#footer-save-entity')
      .click('#footer-save-entity')
      .wait(1000)
      .evaluate(() => {
        const sel = document.querySelector('div[class^="textfieldError"]');
        if (sel) {
          throw new Error(sel.textContent);
        }
      })
      .wait(() => {
        return !document.querySelector('#footer-save-entity');
      })
      .then(done)
      .catch(done);
  });
};

module.exports.removeLoanPolicy = (nightmare, loanPolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should delete the loan policy', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/loan-policies"]')
      .click('a[href="/settings/circulation/loan-policies"]')
      .wait('div.hasEntries')
      .wait((pn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === pn);
        return index >= 0;
      }, loanPolicyName)
      .evaluate((pn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === pn);
        if (index === -1) {
          throw new Error(`Could not find the loan policy ${pn} to delete`);
        }
        // CSS selectors are 1-based, which is just totally awesome.
        return index + 1;
      }, loanPolicyName)
      .then((entryIndex) => {
        nightmare
          .wait(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .click(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .wait('#dropdown-clickable-delete-item')
          .click('#dropdown-clickable-delete-item')
          .wait('#clickable-delete-item-confirmation-confirm')
          .click('#clickable-delete-item-confirmation-confirm')
          .wait((pn) => {
            return Array.from(
              document.querySelectorAll('#OverlayContainer div[class^="calloutBase"]')
            ).findIndex(e => e.textContent === `The Loan policy ${pn} was successfully deleted.`) >= 0;
          }, loanPolicyName)
          .wait('#OverlayContainer [class^=callout] button[icon=times]')
          .click('#OverlayContainer [class^=callout] button[icon=times]')
          .wait(() => !document.querySelector('#OverlayContainer div[class^="calloutBase"]'))
          .then(done)
          .catch(done);
      })
      .catch(done);
  });
};

module.exports.addNoticePolicy = (nightmare, noticePolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should reach "Create notice policy" page', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/notice-policies"]')
      .click('a[href="/settings/circulation/notice-policies"]')
      .wait('#clickable-create-entry')
      .click('#clickable-create-entry')
      .then(done)
      .catch(done);
  });

  it(`should create a new notice policy (${noticePolicyName})`, (done) => {
    nightmare
      .wait('#notice_policy_name')
      .type('#notice_policy_name', noticePolicyName)
      .wait('#notice_policy_active')
      .check('#notice_policy_active')
      .wait('#footer-save-entity')
      .click('#footer-save-entity')
      .wait(1000)
      .evaluate(() => {
        const sel = document.querySelector('div[class^="textfieldError"]');
        if (sel) {
          throw new Error(sel.textContent);
        }
      })
      .wait(() => {
        return !document.querySelector('#footer-save-entity');
      })
      .then(done)
      .catch(done);
  });
};

module.exports.removeNoticePolicy = (nightmare, noticePolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should delete the notice policy', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/notice-policies"]')
      .click('a[href="/settings/circulation/notice-policies"]')
      .wait('div.hasEntries')
      .wait((npn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === npn);
        return index >= 0;
      }, noticePolicyName)
      .evaluate((npn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === npn);
        if (index === -1) {
          throw new Error(`Could not find the notice policy${npn} to delete`);
        }
        // CSS selectors are 1-based, which is just totally awesome.
        return index + 1;
      }, noticePolicyName)
      .then((entryIndex) => {
        nightmare
          .wait(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .click(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .wait('#generalInformation')
          .wait('#dropdown-clickable-delete-item')
          .click('#dropdown-clickable-delete-item')
          .wait('#clickable-delete-item-confirmation-confirm')
          .click('#clickable-delete-item-confirmation-confirm')
          .wait((npn) => {
            return Array.from(
              document.querySelectorAll('#OverlayContainer div[class^="calloutBase"]')
            ).findIndex(e => e.textContent === `The Patron notice policy ${npn} was successfully deleted.`) >= 0;
          }, noticePolicyName)
          .wait('#OverlayContainer [class^=callout] button[icon=times]')
          .click('#OverlayContainer [class^=callout] button[icon=times]')
          .wait(() => !document.querySelector('#OverlayContainer div[class^="calloutBase"]'))
          .then(done)
          .catch(done);
      })
      .catch(done);
  });
};

module.exports.addRequestPolicy = (nightmare, requestPolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should reach "Create request policy" page', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/request-policies"]')
      .click('a[href="/settings/circulation/request-policies"]')
      .wait('#clickable-create-entry')
      .click('#clickable-create-entry')
      .then(done)
      .catch(done);
  });

  it(`should create a new request policy (${requestPolicyName})`, (done) => {
    nightmare
      .wait('#request_policy_name')
      .type('#request_policy_name', requestPolicyName)
      .wait('#hold-checkbox')
      .check('#hold-checkbox')
      .wait('#page-checkbox')
      .check('#page-checkbox')
      .wait('#recall-checkbox')
      .check('#recall-checkbox')
      .wait('#footer-save-entity')
      .click('#footer-save-entity')
      .wait(1000)
      .evaluate(() => {
        const sel = document.querySelector('div[class^="textfieldError"]');
        if (sel) {
          throw new Error(sel.textContent);
        }
      })
      .wait(() => {
        return !document.querySelector('#footer-save-entity');
      })
      .then(done)
      .catch(done);
  });
};

module.exports.removeRequestPolicy = (nightmare, requestPolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should delete the request policy', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/request-policies"]')
      .click('a[href="/settings/circulation/request-policies"]')
      .wait('div.hasEntries')
      .wait((rpn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === rpn);
        return index >= 0;
      }, requestPolicyName)
      .evaluate((rpn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === rpn);
        if (index === -1) {
          throw new Error(`Could not find the request policy ${rpn} to delete`);
        }
        // CSS selectors are 1-based, which is just totally awesome.
        return index + 1;
      }, requestPolicyName)
      .then((entryIndex) => {
        nightmare
          .wait(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .click(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .wait('#general')
          .wait('#dropdown-clickable-delete-item')
          .click('#dropdown-clickable-delete-item')
          .wait('#clickable-delete-item-confirmation-confirm')
          .click('#clickable-delete-item-confirmation-confirm')
          .wait((rpn) => {
            return Array.from(
              document.querySelectorAll('#OverlayContainer div[class^="calloutBase"]')
            ).findIndex(e => e.textContent === `The Request policy ${rpn} was successfully deleted.`) >= 0;
          }, requestPolicyName)
          .wait('#OverlayContainer [class^=callout] button[icon=times]')
          .click('#OverlayContainer [class^=callout] button[icon=times]')
          .wait(() => !document.querySelector('#OverlayContainer div[class^="calloutBase"]'))
          .then(done)
          .catch(done);
      })
      .catch(done);
  });
};

module.exports.addOverdueFinePolicy = (nightmare, overdueFinePolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should reach "Create overdue fine policy" page', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/fine-policies"]')
      .click('a[href="/settings/circulation/fine-policies"]')
      .wait('#clickable-create-entry')
      .click('#clickable-create-entry')
      .then(done)
      .catch(done);
  });

  it(`should create a new overdue fine policy (${overdueFinePolicyName})`, (done) => {
    nightmare
      .wait('#input-policy-name')
      .type('#input-policy-name', overdueFinePolicyName)
      .wait('input[name="overdueFine.quantity"]')
      .insert('input[name="overdueFine.quantity"]', '')
      .insert('input[name="overdueFine.quantity"]', '1.00')
      .wait('select[name="overdueFine.intervalId"]')
      .type('select[name="overdueFine.intervalId"]', 'min')
      .wait('input[name="maxOverdueFine"]')
      .insert('input[name="maxOverdueFine"]', '')
      .insert('input[name="maxOverdueFine"]', '1.00')
      .wait('input[name="overdueRecallFine.quantity"]')
      .insert('input[name="overdueRecallFine.quantity"]', '')
      .insert('input[name="overdueRecallFine.quantity"]', '1.00')
      .wait('select[name="overdueRecallFine.intervalId"]')
      .type('select[name="overdueRecallFine.intervalId"]', 'min')
      .wait('input[name="maxOverdueRecallFine"]')
      .insert('input[name="maxOverdueRecallFine"]', '')
      .insert('input[name="maxOverdueRecallFine"]', '1.00')
      .wait('#footer-save-entity')
      .click('#footer-save-entity')
      .wait(1000)
      .evaluate(() => {
        const sel = document.querySelector('div[class^="textfieldError"]');
        if (sel) {
          throw new Error(sel.textContent);
        }
      })
      .wait(() => {
        return !document.querySelector('#footer-save-entity');
      })
      .then(done)
      .catch(done);
  });
};

module.exports.removeOverdueFinePolicy = (nightmare, overdueFinePolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should delete the overdue fine policy', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/fine-policies"]')
      .click('a[href="/settings/circulation/fine-policies"]')
      .wait('div.hasEntries')
      .wait((rpn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === rpn);
        return index >= 0;
      }, overdueFinePolicyName)
      .evaluate((rpn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === rpn);
        if (index === -1) {
          throw new Error(`Could not find the request policy ${rpn} to delete`);
        }
        // CSS selectors are 1-based, which is just totally awesome.
        return index + 1;
      }, overdueFinePolicyName)
      .then((entryIndex) => {
        nightmare
          .wait(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .click(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .wait('#generalInformation')
          .wait('#dropdown-clickable-delete-item')
          .click('#dropdown-clickable-delete-item')
          .wait('#clickable-delete-item-confirmation-confirm')
          .click('#clickable-delete-item-confirmation-confirm')
          .wait((rpn) => {
            return Array.from(
              document.querySelectorAll('#OverlayContainer div[class^="calloutBase"]')
            ).findIndex(e => e.textContent === `The Overdue fine policies ${rpn} was successfully deleted.`) >= 0;
          }, overdueFinePolicyName)
          .wait('#OverlayContainer [class^=callout] button[icon=times]')
          .click('#OverlayContainer [class^=callout] button[icon=times]')
          .wait(() => !document.querySelector('#OverlayContainer div[class^="calloutBase"]'))
          .then(done)
          .catch(done);
      })
      .catch(done);
  });
};


module.exports.addLostItemFeePolicy = (nightmare, lostItemFeePolicyName, duration, durationInterval) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should reach "Create lost item fee policy" page', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/lost-item-fee-policy"]')
      .click('a[href="/settings/circulation/lost-item-fee-policy"]')
      .wait('#clickable-create-entry')
      .click('#clickable-create-entry')
      .then(done)
      .catch(done);
  });

  it(`should create a new lost item fee policy (${lostItemFeePolicyName})`, (done) => {
    nightmare
      .wait('select[name="lostItemChargeFeeFine.intervalId"]')
      .type('select[name="lostItemChargeFeeFine.intervalId"]', durationInterval)
      .wait('#input-policy-name')
      .type('#input-policy-name', lostItemFeePolicyName)
      .wait('input[name="lostItemChargeFeeFine.duration"]')
      .type('input[name="lostItemChargeFeeFine.duration"]', duration)
      .click('#footer-save-entity')
      .wait(1000)
      .evaluate(() => {
        const sel = document.querySelector('div[class^="textfieldError"]');
        if (sel) {
          throw new Error(sel.textContent);
        }
      })
      .wait(() => {
        return !document.querySelector('#footer-save-entity');
      })
      .then(done)
      .catch(done);
  });
};


module.exports.removeLostItemFeePolicy = (nightmare, lostItemPolicyName) => {
  it('should navigate to settings', (done) => {
    clickSettings(nightmare, done);
  });

  it('should delete the lost item policy', (done) => {
    nightmare
      .wait('a[href="/settings/circulation"]')
      .click('a[href="/settings/circulation"]')
      .wait('a[href="/settings/circulation/lost-item-fee-policy"]')
      .click('a[href="/settings/circulation/lost-item-fee-policy"]')
      .wait('div.hasEntries')
      .wait((rpn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === rpn);
        return index >= 0;
      }, lostItemPolicyName)
      .evaluate((rpn) => {
        const index = Array.from(
          document.querySelectorAll('#ModuleContainer div.hasEntries a[class^=NavListItem]')
        ).findIndex(e => e.textContent === rpn);
        if (index === -1) {
          throw new Error(`Could not find the request policy ${rpn} to delete`);
        }
        // CSS selectors are 1-based, which is just totally awesome.
        return index + 1;
      }, lostItemPolicyName)
      .then((entryIndex) => {
        nightmare
          .wait(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .click(`#ModuleContainer div.hasEntries div:nth-of-type(${entryIndex}) a[class^=NavListItem]`)
          .wait('#LostItemFeeGeneralInformation')
          .wait('#dropdown-clickable-delete-item')
          .click('#dropdown-clickable-delete-item')
          .wait('#clickable-delete-item-confirmation-confirm')
          .click('#clickable-delete-item-confirmation-confirm')
          .wait((rpn) => {
            return Array.from(
              document.querySelectorAll('#OverlayContainer div[class^="calloutBase"]')
            ).findIndex(e => e.textContent === `The Lost item fee policies ${rpn} was successfully deleted.`) >= 0;
          }, lostItemPolicyName)
          .wait('#OverlayContainer [class^=callout] button[icon=times]')
          .click('#OverlayContainer [class^=callout] button[icon=times]')
          .wait(() => !document.querySelector('#OverlayContainer div[class^="calloutBase"]'))
          .then(done)
          .catch(done);
      })
      .catch(done);
  });
};


module.exports.usersRowWrapperSelector = '#list-users [role=rowgroup] [data-row-inner]';
