const Nightmare = require('./xnightmare.js')
const minimist = require('minimist')
const config = require('./folio-ui.config.js')
const helpers = require('./helpers.js');

const o = minimist(process.argv.slice(2))

if (o.run) {

  let options = getOptions(o,config);

  if (options.host||options.h)              console.log("Host:          "+config.url);
  if (options.testtimeout||options.timeout) console.log("Test timeout:  "+config.test_timeout);
  if (options.gototimeout||options.goto)    console.log("Goto timeout:  "+ config.nightmare.gotoTimeout);
  if (options.loginwait)                    console.log("Login wait     "+config.login_wait);
  if (options.debugsleep||options.sleep)    console.log("Debug sleep:   "+config.debug_sleep);
  if (options.username||options.un)         console.log("Username:      "+config.username);
  if (options.typeinterval)                 console.log("Type interval: "+config.nightmare.typeInterval);

  const apps = options.run.split('/'); // find modules to test

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
  showHelp();
}

function getOptions (o, config) {
  const recognizedOptions =
  [ "run",
    "host", "h",
    "testtimeout", "timeout",
    "gototimeout", "goto",
    "loginwait",
    "debugsleep", "sleep",
    "typeinterval",
    "username", "un",
    "password", "pw",
    "show",
    "devtools",
    "width",
    "height"
  ];

  let options = {};
  for (var property in o) {
      if (o.hasOwnProperty(property)) {
        if (property!="_" && property!="o") {
          let prop = property.toLowerCase().replace(/_/g,'');
          if (recognizedOptions.indexOf(prop)>-1) {
            options[prop] = o[property];
          } else {
            console.log("Ignoring unrecognized option: ",property);
          }
        }
      }
  }
  let run = options.run.replace(/\s/g, '');

  if (options.host||options.h) {
    let host = (options.host||options.h).replace(/\s/g,'');
    let overrides = {
      localhost: "http://localhost:3000",
      staging: "http://folio-staging.aws.indexdata.com",
      testing: "http://folio-testing.aws.indexdata.com",
      host: host,
    }
    config.url = overrides[host] || overrides.host;
  }
  config.test_timeout = options.testtimeout || options.timeout  || config.testTimeout;
  config.login_wait = options.loginwait || config.login_wait;
  config.debug_sleep = options.debugsleep || options.sleep || config.debug_sleep;
  config.username = options.username || options.un || config.username;
  config.password = options.password || options.pw || config.password;
  if (options.show) {
    config.nightmare = {
      width: options.width || 1600,
      height: options.width || 1200,
      typeInterval: options.typeinterval || 75,
      show: true,
      gotoTimeout: options.gototimeout || options.goto || 90000
    };
  }
  if (options.devtools) {
    config.nightmare = {
      typeInterval: options.typeinterval || 75,
      openDevTools: {
        mode: 'detach'
      },
      width: 800,
      height: 600,
      show: true,
      gotoTimeout: options.gototimeout || options.goto || 90000
    };
  }
  return options;
}

function showHelp() {
  console.log("test-module:   Missing 'run' argument. Found no modules or tests to run.");
  console.log("");
  console.log("");
  console.log("Usage:");
  console.log("");
  console.log("  yarn test-module -- -o --run=module[:script[,script]][/module[:script[,script]]]  [options]");
  console.log("");
  console.log("Examples:");
  console.log("");
  console.log("  yarn test-module -- -o --run=requests                     Runs main tests (test.js) for UI module 'requests'")
  console.log("  yarn test-module -- -o --run=users/items                  Runs tests (test.js) for multiple UI modules");
  console.log("  yarn test-module -- -o --run=users:new_user,patron_group  Runs specific tests for 'users'");
  console.log("");
  console.log("");
  console.log("Options");
  console.log("");
  console.log("  --host, --h ");
  console.log("      Override default URL of application to be tested. ");
  console.log("      Predefined options: ");
  console.log("         --h=localhost :   http://localhost:3000");
  console.log("         --h=testing   :   http://folio-testing.aws.indexdata.com (the default URL)");
  console.log("         --h=staging   :   http://folio-staging.aws.indexdata.com");
  console.log("         --h=[any other URL for the application to be tested]");
  console.log("");
  console.log("  --gotoTimeout, goto");
  console.log("      Set the timeout for opening a URL, in milliseconds:    --goto=20000");
  console.log("");
  console.log("  --testTimeout, --timeout");
  console.log("      Set overall timeout for each test that use this argument");
  console.log("        in milliseconds:  --timeout=30000");
  console.log("");
  console.log("  --debugSleep, --sleep");
  console.log("       Set the sleep time for tests that use this argument, in milliseconds: --sleep=4000");
  console.log("");
  console.log("  --loginWait");
  console.log("        Set the time to wait for the login page load to complete for tests that");
  console.log("        use this argument. The provided login helper ('helpers.login')");
  console.log("        will honor this argument, in milliseconds:        --loginWait=2000");
  console.log("")
  console.log("   --typeInterval");
  console.log("        Override the default typing interval on user input, in milliseconds:  --typeinterval=50");
  console.log("");
  console.log("  --username, --un");
  console.log("        Override the default username used for testing:   --un=myuser");
  console.log("");
  console.log("  --password, --pw");
  console.log("        Override the default password used for testing:  --pw=mypass")
  console.log("");
  console.log("  --show");
  console.log("      Show test execution in browser window:   --show");
  console.log("");
  console.log("  --width");
  console.log("      Change the default width of the browser window:    --width=800");
  console.log("");
  console.log("  --height");
  console.log("      Change the default height of the browser window:    --height=600");
  console.log("");
  console.log("  --devTools");
  console.log("      Show test execution in browser window with DevTools opened:  --devTools");
  console.log("");
  console.log("Examples using options: ");
  console.log("");
  console.log("  Run a test against localhost port 3000, show the execution in a browser window:");
  console.log("");
  console.log("    yarn test-module -- -o --show --h=localhost --run=checkout:error_messages");
  console.log(""),
  console.log("  Run a test against folio-testing, in a browser window with dev tools opened,");
  console.log("  using increased test timeouts and long login wait setting:");
  console.log("");
  console.log("    yarn test-module -- -o --devTools --h=testing --timeout=90000 --loginWait=5000 --run=users:new_user");
  console.log("");
  console.log("Info:");
  console.log("");
  console.log("  The script will run a UI module's Nightmare tests, provided that the module has tests defined and ");
  console.log("");
  console.log("   a) is included as a dependency in /ui-testing/package.json ");
  console.log("   b) runs on the FOLIO web application targeted by this test");
  console.log("");
  console.log("  The npm version of the test suite should match the version of the live module being tested.");
  console.log("");
}
