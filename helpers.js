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
    .then(() => { done(); })
    .catch(done);
};

module.exports.logout = (nightmare, config, done) => {
  nightmare
    .click('#clickable-logout') // logout
    .wait('#clickable-login') // login page
    .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep / 3, 10) : 0) // debugging
    .end()
    .then(() => { done(); })
    .catch(done);
};
module.exports.logoutWithoutEnd = (nightmare, config, done) => {
  nightmare
    .click('#clickable-logout') // logout
    .wait('#clickable-login') // login page
    .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep / 3, 10) : 0) // debugging
    .then(() => { done(); })
    .catch(done);
};
module.exports.openApp = (nightmare, config, done, app, testVersion) => function opena() {
  nightmare
    .wait(`#clickable-${app}-module`)
    .click(`#clickable-${app}-module`)
    .wait(`#${app}-module-display`)
    .evaluate((mapp) => {
      const metadata = document.querySelector(`#${mapp}-module-display`);
      return {
        moduleName: metadata.getAttribute('data-module'),
        moduleVersion: metadata.getAttribute('data-version'),
      };
    }, app)
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

module.exports.createInventory = (nightmare, config, title, holdingsOnly) => {
  const ti = title || 'New test title';
  const id = new Date().valueOf();
  const barcode = new Date().valueOf();
  if (!holdingsOnly) {
    it('should create inventory record', (done) => {
      nightmare
        .click('#clickable-inventory-module')
        .wait('#clickable-newinventory')
        .click('#clickable-newinventory')
        .wait('#input_instance_title')
        .insert('#input_instance_title', ti)
        .insert('input[name=hrid]', id)
        .type('#select_instance_type', 'o')
        .click('#clickable-create-instance')
        .waitUntilNetworkIdle(500)
        .then(done)
        .catch(done);
    });
  }
  it('should create holdings record', (done) => {
    nightmare
      .wait('#clickable-new-holdings-record')
      .click('#clickable-new-holdings-record')
      .wait('#additem_permanentlocation')
      .type('#additem_permanentlocation', 'm')
      .insert('#additem_callnumber', 'ZZ39.50')
      .click('#clickable-create-item')
      .wait('#clickable-new-item')
      .then(done)
      .catch(done);
  });
  it('should create item record', (done) => {
    nightmare
      .click('#clickable-new-item')
      .wait('#additem_materialType option:nth-of-type(2)')
      .type('#additem_materialType ', 'b')
      .wait('#additem_loanTypePerm option:nth-of-type(2)')
      .type('#additem_loanTypePerm', 'cc')
      .insert('#additem_barcode', barcode)
      .wait(500)
      .click('#clickable-create-item')
      .then(done)
      .catch(done);
  });
  return barcode;
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
 * Visit "settings > organization > locale" and set the locale to
 * US-English and the timezone to America/New_York.
 */
module.exports.setUsEnglishLocale = (nightmare, config, done) => {
  nightmare
    .wait(config.select.settings)
    .click(config.select.settings)
    .wait('a[href="/settings/organization"]')
    .click('a[href="/settings/organization"]')
    .wait('a[href="/settings/organization/locale"]')
    .click('a[href="/settings/organization/locale"]')
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
module.exports.clickApp = (nightmare, config, done, app) => function opena() {
  nightmare
    .wait(`#app-list-item-clickable-${app}-module`)
    .click(`#app-list-item-clickable-${app}-module`)
    .wait(`#${app}-module-display`)
    .exists('#app-list-dropdown-toggle[aria-expanded="true"]')
    .then(dropdownOpen => {
      if (dropdownOpen) nightmare.click('#app-list-dropdown-toggle');
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
module.exports.clickSettings = (nightmare, config, done) => function opena() {
  nightmare
    .wait('#app-list-item-clickable-settings')
    .click('#app-list-item-clickable-settings')
    .exists('#app-list-dropdown-toggle[aria-expanded="true"]')
    .then(dropdownOpen => {
      if (dropdownOpen) nightmare.click('#app-list-dropdown-toggle');
    })
    .then(done)
    .catch(done);
};
