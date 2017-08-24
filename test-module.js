const Nightmare = require('./xnightmare.js')
const minimist = require('minimist')
const config = require('./folio-ui.config.js')
const auth = require('./auth.js');
const names = require('./namegen.js')

config.nightmare.gotoTimeout = 90000;

const app = minimist(process.argv.slice(2)).app;
const appArray = app.split(',');
var appTest = null;
for (var i=0; i< appArray.length; i++) {
  try {

    var scripts = '@folio/'+appArray[i]+'/test/ui-testing/test.js'
    console.log("Test: ", scripts);
    appTest = require(scripts);
    try {
      appTest.test({ config, utils: { auth, names }});
    } catch (e) {
      console.log("Could not run tests for module ", appArray[i], e);
    }
  } catch (e) {
    console.log('Module or test not found: ', appArray[i], e);
  }
}

