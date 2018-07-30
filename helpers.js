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
    .wait('#list-users div[role="listitem"]')
    .evaluate(() => {
      const udata = [];
      const users = document.querySelectorAll('#list-users div[role="listitem"]');
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
  const barcode = new Date().valueOf();
  if (!holdingsOnly) {
    it('should create inventory record', (done) => {
      nightmare
        .click('#clickable-inventory-module')
        .wait('#clickable-newinventory')
        .click('#clickable-newinventory')
        .wait('#input_instance_title')
        .insert('#input_instance_title', ti)
        .wait(333)
        .type('#select_instance_type', 'o')
        .wait(2222)
        .click('#clickable-create-instance')
        .wait(2222)
        .then(done)
        .catch(done);
    });
  }
  it('should create holdings record', (done) => {
    nightmare
      .click('#clickable-new-holdings-record')
      .wait('#additem_permanentlocation')
      .wait(333)
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
      .wait('#additem_materialType')
      .wait(1111)
      .type('#additem_materialType', 'b')
      .wait(222)
      .type('#additem_loanTypePerm', 'cc')
      .wait(222)
      .insert('#additem_barcode', barcode)
      .wait(222)
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
    .wait('#clickable-settings')
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
