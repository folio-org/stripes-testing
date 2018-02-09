module.exports.login = (nightmare, config, done, un, pw) => {
  nightmare
  .on('page', function(type="alert", message) {
     throw new Error(message)
   })
  .goto(config.url)
  .wait(Number(config.login_wait))
  .insert(config.select.username, (un || config.username))
  .insert(config.select.password, (pw || config.password))
  .click('#clickable-login')
  .wait('#clickable-logout')
  .then(result => {done()})
  .catch(done)
};

module.exports.logout = (nightmare, config, done) => {
  nightmare
  .click('#clickable-logout') // logout
  .wait('#clickable-login') // login page
  .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep/3) : 0) // debugging
  .end()
  .then(result => {done()})
  .catch(done)
}

module.exports.openApp = (nightmare, config, done, app, testVersion) => {
  return function(nightmare) {
    nightmare
    .wait('#clickable-'+app+'-module')
    .click('#clickable-'+app+'-module')
    .wait('#'+app+'-module-display')
    .evaluate(function(app) {
      let metaData = document.querySelector('#'+app+'-module-display');
      return {
        moduleName: metaData.getAttribute('data-module'),
        moduleVersion: metaData.getAttribute('data-version')
      }
    }, app)
    .then(function(meta) {
      if (testVersion !== undefined) {
        console.log("          Test suite   "+testVersion);
        console.log("          Live module  "+meta.moduleName+":"+meta.moduleVersion+" ("+config.url+")");
      }
      done();
      return meta;
    }).catch(done);
  }
}

module.exports.getUsers = (nightmare, config, done) => {
      return function(nightmare) {
	nightmare
        .click('#clickable-users-module')
        .wait('#list-users div[role="listitem"]')
        .evaluate(() => {
          var udata = new Array();
          var users = document.querySelectorAll('#list-users div[role="listitem"]');
          for (x = 0; x <users.length; x++) {
            var st = users[x].querySelector('div:nth-of-type(1)').innerText;
            var nm = users[x].querySelector('div:nth-of-type(2)').innerText;
            var bc = users[x].querySelector('div:nth-of-type(3)').innerText;
            var pg = users[x].querySelector('div:nth-of-type(4)').innerText;
            var id = users[x].querySelector('div:nth-of-type(5)').innerText;
            var em = users[x].querySelector('div:nth-of-type(6)').innerText;
            if (bc.match(/\d/)) {
              udata.push({ status: st, name: nm, barcode: bc, group: pg, id: id, email: em });
            }
          } 
          return udata;
        })
        .then((u) => {
           done();
	   return u;
        })
        .catch(done);
      }
}

module.exports.createInventory = (nightmare, config) => {
    var barcode = new Date().valueOf()
    it('should create inventory record', done=> {
      nightmare
      .click('#clickable-inventory-module')
      .wait(2222)
      .click('#clickable-newinventory')
      .wait('#input_instance_title')
      .insert('#input_instance_title', 'New test title')
      .wait(333)
      .type('#select_instance_type', 'b')
      .click('#clickable-create-instance')
      .wait('#clickable-new-holdings-record')
      .then(result => { done() })
      .catch(done)
    })
    it('should create holdings record', done=> {
      nightmare
      .click('#clickable-new-holdings-record')
      .wait('#additem_permanentlocation')
      .type('#additem_permanentlocation', 'm')
      .insert('#additem_callnumber', 'ZZ39.50')
      .click('#clickable-create-item')
      .wait('#clickable-new-item')
      .then(result => { done() })
      .catch(done)
    })
    it('should create item record', done=> {
      nightmare
      .click('#clickable-new-item')
      .wait('#additem_materialType')
      .type('#additem_materialType', 's')
      .wait(222)
      .type('#additem_loanTypePerm', 'cc')
      .wait(222)
      .insert('#additem_barcode', barcode)
      .wait(222)
      .click('#clickable-create-item')
      .then(result => { done() })
      .catch(done)
    })
    return {
      barcode: barcode
    }
}

module.exports.namegen = function() {
  var ts = new Date().valueOf()
  var fn = ['Emma','Olivia','Ava','Sophia','Isabella','Liam','Noah','Mason','Lucas','Oliver']
  var ln = ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriquez','Wilson']
  var ad = [{city: 'Chicago',zip: '60609',address: '5 Wacker Dr', country: 'United States',state: 'IL', phone:'13125552121'},
            {city: 'New York',zip: '10002-2341',address: '425 Bowery', country: 'United States',state: 'NY', phone:'12125554444'},
            {city: 'San Francisco',zip: '94016',address: '39 Green Street', country: 'United States',state: 'CA', phone:'12153338888'},
            {city: 'København',zip: '1208',address: 'Nybrogade 30', country: 'Denmark',state: 'K', phone:'453332229999'}]
  var fnpos = Math.floor(Math.random() * fn.length)
  var lnpos = Math.floor(Math.random() * ln.length)
  var adpos = Math.floor(Math.random() * ad.length)
  var firstname = fn[fnpos]
  var lastname = ln[lnpos]
  return {
    id: firstname.substr(0,1).toLowerCase() + lastname.toLowerCase() + ts,
    firstname: firstname,
    lastname: lastname,
    email: firstname.toLowerCase() + '.' + lastname.toLowerCase() + '@someserver.org',
    barcode: ts,
    password: 'P@$$w0rd23',
    address: ad[adpos]
  }
}
