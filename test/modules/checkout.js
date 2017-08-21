const Nightmare = require('../../xnightmare.js')
const config = require('../../folio-ui.config.js')
config.nightmare.gotoTimeout = 90000
const auth = require('../../auth.js');
const checkout = require('@folio/checkout/test/nightmare/test.js');

const nightmare = new Nightmare(config.nightmare);

checkout.test({ nightmare, config, utils: { auth }});
