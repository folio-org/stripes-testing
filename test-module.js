const Nightmare = require('./xnightmare.js')
const minimist = require('minimist')
const config = require('./folio-ui.config.js')
const helpers = require('./helpers.js');

config.nightmare.gotoTimeout = 90000;

let run = minimist(process.argv.slice(2)).run;

if (run) {
  run = run.replace(/\s/g, '');

  const apps = run.split('/'); // find modules to test

  for (var a=0; a< apps.length; a++) { // for each module in argv
    let appscripts = apps[a];

    if (appscripts.length>0) {

      let app = "";
      let scripts = [];
      if (appscripts.indexOf(":") == -1) { // no scripts requested, run main ("test.js")
        app = appscripts;
        scripts.push("test");
      } else {                             // get scripts
        app = appscripts.substring(0, appscripts.indexOf(":"));
        scripts = appscripts.substring(appscripts.indexOf(":")+1).split(',');
        let run_main = true;
        for (var s=0; s<scripts.length; s++) {
          if (scripts[s].length>0) {
            run_main=false;
          }
        }
        if (run_main) {
          console.log('No scripts found after script indicator ":", running main ("test.js") for module "'+app+'"');
          scripts[0] = 'test';
        }
      }

      let emptyScriptArg = false;
      for (var j=0; j<scripts.length; j++) { // for each test script requested from the module
        let script = scripts[j];
        if (script) {
          try {
            let tests = require('@folio/'+app+'/test/ui-testing/'+script+'.js');
            let moduleInfo = require('@folio/'+app+'/package.json');
            let meta = { testVersion: moduleInfo.name+':'+moduleInfo.version };
            try {
              tests.test({ config, helpers, meta } );
            } catch (e) {
              console.log('Could not run tests for module "'+app+'"\n', e);
            }
          } catch (e) {
            console.log('Module or test script not found: "'+app+ (script=='test' ? '' : ':'+ script) +'"\n', e);
          }
        } else {
          emptyScriptArg = true;
        }
      }
      if (emptyScriptArg) {
        console.log('Found empty script argument(s) for "'+app+'". Skipped.');
      }
    }
  }
} else {
  console.log("test-module:   Missing 'run' argument. Found no modules or tests to run.");
  console.log("");
  console.log("");
  console.log("Usage:");
  console.log("");
  console.log("  yarn test-module -- -o --run=module[:script[,script]][/module[:script[,script]]]");
  console.log("");
  console.log("Examples:");
  console.log("");
  console.log("  yarn test-module -- -o --run=requests                     Runs main tests (test.js) for UI module 'requests'")
  console.log("  yarn test-module -- -o --run=users/items                  Runs tests (test.js) for multiple UI modules");
  console.log("  yarn test-module -- -o --run=users:new_user,patron_group  Runs specific tests for 'users'");
  console.log("");
  console.log("Info:");
  console.log("");
  console.log("  The script will run a UI module's Nightmare tests, provided that the module has tests defined and ");
  console.log("");
  console.log("   a) is included as a dependency in /ui-testing/package.json ");
  console.log("   b) runs on the FOLIO web application targeted by this test (see URL settings in /ui-testing/folio-ui-config.js)");
  console.log("");
  console.log("  The npm version of the test suite should match the version of the live module being tested.");
  console.log("");
}
