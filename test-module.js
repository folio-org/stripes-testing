const Nightmare = require('./xnightmare.js')
const minimist = require('minimist')
const config = require('./folio-ui.config.js')
const auth = require('./auth.js');
const names = require('./namegen.js')

config.nightmare.gotoTimeout = 90000;

let app = minimist(process.argv.slice(2)).app;

if (app) {
  app = app.replace(/\s/g, '');

  const appArray = app.split('/');
  var appTest = null;
  console.log("Running module tests against "+config.url+": ")
  for (var i=0; i< appArray.length; i++) {
    if (appArray[i].length>0) {
      let app = "";
      let scriptArray = [];
      if (appArray[i].indexOf(":") == -1) {
        app = appArray[i];
        scriptArray.push("test");
      } else {
        app = appArray[i].substring(0,appArray[i].indexOf(":"));
        scriptArray = appArray[i].substring(appArray[i].indexOf(":")+1).split(',');
        if (scriptArray[0].length === 0) {
          scriptArray[0] = "test";
        }
      }
      for (var j=0; j<scriptArray.length; j++) {
        if (scriptArray[j].length>0) {
          try {
            var script = scriptArray[j];
            var testscript = '@folio/'+app+'/test/ui-testing/'+script+'.js'
            console.log(' '+app+(script != "test" ? '/'+script : ''));
            appTest = require(testscript);
            try {
              appTest.test({ config, utils: { auth, names }});
            } catch (e) {
              console.log("Could not run tests for module ", app, e);
            }
          } catch (e) {
            console.log('Module or test not found: ', app, e);
          }
        }
      }
    }
  }
} else {
  console.log("Found no modules or tests to run.");
}
