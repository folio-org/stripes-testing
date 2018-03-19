/* eslint-disable no-console, eqeqeq, no-prototype-builtins, no-shadow, import/no-dynamic-require, global-require */
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Nightmare" }] */
const Nightmare = require('./xnightmare.js');
const minimist = require('minimist');
const config = require('./folio-ui.config.js');
const helpers = require('./helpers.js');

const options = minimist(process.argv.slice(2));

function showHelp() {
  console.log("test-module:   Missing 'run' argument. Found no modules or tests to run.");
  console.log('');
  console.log('');
  console.log('Usage:');
  console.log('');
  console.log('  yarn test-module -- -o --run=module[:script[,script]][/module[:script[,script]]]  [options]');
  console.log('');
  console.log('Examples:');
  console.log('');
  console.log("  yarn test-module -- -o --run=requests                     Runs main tests (test.js) for UI module 'requests'");
  console.log('  yarn test-module -- -o --run=users/items                  Runs tests (test.js) for multiple UI modules');
  console.log("  yarn test-module -- -o --run=users:new_user,patron_group  Runs specific tests for 'users'");
  console.log('');
  console.log('');
  console.log('Options');
  console.log('');
  console.log('  --host, --h, --url ');
  console.log('      Override default URL of application to be tested. ');
  console.log('      Predefined options: ');
  console.log('         --h=localhost :   http://localhost:3000');
  console.log('         --h=testing   :   http://folio-testing.aws.indexdata.com (the default URL)');
  console.log('         --h=staging   :   http://folio-staging.aws.indexdata.com');
  console.log('         --h=[any other URL for the application to be tested]');
  console.log('');
  console.log('      Corresponds to environment variable FOLIO_UI_URL');
  console.log('');
  console.log('  --waitTimeout, --wto');
  console.log('      Set the timeout for wait actions, in milliseconds:    --waitTimeout=30000');
  console.log('');
  console.log('      Corresponds to environment variable FOLIO_UI_WAIT_TIMEOUT');
  console.log('');
  console.log('  --gotoTimeout, --gto');
  console.log('      Set the timeout for opening a URL, in milliseconds:    --gotoTimeout=20000');
  console.log('');
  console.log('      Corresponds to environment variable FOLIO_UI_GOTO_TIMEOUT');
  console.log('');
  console.log('  --executionTimeout, --eto');
  console.log('      Set the timeout for evaluate(), in milliseconds:    --executionTimeout=20000');
  console.log('');
  console.log('      Corresponds to environment variable FOLIO_UI_EXECUTION_TIMEOUT');
  console.log('');
  console.log('  --testTimeout, --tto');
  console.log('      Set overall timeout for each test that use this argument');
  console.log('        in milliseconds:  --timeout=30000');
  console.log('');
  console.log('      Corresponds to environment variable FOLIO_UI_TEST_TIMEOUT');
  console.log('');
  console.log('  --debugSleep, --sleep');
  console.log('      Set the sleep time for tests that use this argument, in milliseconds: --sleep=4000');
  console.log('');
  console.log('      Corresponds to enviroment variable FOLIO_UI_DEBUG_SLEEP');
  console.log('');
  console.log('  --loginWait');
  console.log('      Set the time to wait for the login page load to complete for tests that');
  console.log("      honor this setting. The provided login helper ('helpers.login')");
  console.log('      will honor this argument, in milliseconds:        --loginWait=2000');
  console.log('');
  console.log('      Corresponds to enviroment variable FOLIO_UI_LOGIN_WAIT');
  console.log('');
  console.log('  --typeInterval');
  console.log('      Override the default typing interval on user input, in milliseconds:  --typeinterval=50');
  console.log('');
  console.log('  --username, --un');
  console.log('      Override the default username used for testing:   --un=myuser');
  console.log('');
  console.log('      Corresponds to enviroment variable FOLIO_UI_USERNAME');
  console.log('');
  console.log('  --password, --pw');
  console.log('      Override the default password used for testing:  --pw=mypass');
  console.log('');
  console.log('      Corresponds to enviroment variable FOLIO_UI_PASSWORD');
  console.log('');
  console.log('  --show');
  console.log('      Show test execution in browser window:   --show');
  console.log('');
  console.log('      Corresponds to enviroment variable FOLIO_UI_DEBUG=1');
  console.log('');
  console.log('  --width');
  console.log('      Change the default width of the browser window:    --width=800');
  console.log('');
  console.log('  --height');
  console.log('      Change the default height of the browser window:    --height=600');
  console.log('');
  console.log('  --devTools');
  console.log('      Show test execution in browser window with DevTools opened:  --devTools');
  console.log('');
  console.log('      Corresponds to enviroment variable FOLIO_UI_DEBUG=2');
  console.log('');
  console.log('');
  console.log('Examples using options: ');
  console.log('');
  console.log('  Run a test against localhost port 3000, show the execution in a browser window:');
  console.log('');
  console.log('    yarn test-module -- -o --show --h=localhost --run=checkout:error_messages');
  console.log('');
  console.log('  Run a test against folio-testing, in a browser window with dev tools opened,');
  console.log('  using increased test timeouts and long login wait setting:');
  console.log('');
  console.log('    yarn test-module -- -o --devTools --h=testing --timeout=90000 --loginWait=5000 --run=users:new_user');
  console.log('');
  console.log('Info:');
  console.log('');
  console.log("  The script will run a UI module's Nightmare tests, provided that the module has tests defined and ");
  console.log('');
  console.log('   a) is included as a dependency in /ui-testing/package.json ');
  console.log('   b) runs on the FOLIO web application targeted by this test');
  console.log('');
  console.log('  The npm version of the test suite should match the version of the live module being tested.');
  console.log('');
}

function getOptions(opts, config) {
  const recognizedOptions =
  ['run',
    'host', 'h', 'url',
    'testtimeout', 'tto',
    'gototimeout', 'gto',
    'executiontimeout', 'eto',
    'waittimeout', 'wto',
    'loginwait',
    'debugsleep', 'sleep',
    'typeinterval',
    'username', 'un',
    'password', 'pw',
    'show',
    'devtools',
    'width',
    'height',
  ];

  const o = {};
  for (const property in opts) {
    if (opts.hasOwnProperty(property)) {
      if (property != '_' && property != 'o') {
        const prop = property.toLowerCase().replace(/_/g, '');
        if (recognizedOptions.indexOf(prop) > -1) {
          o[prop] = opts[property];
        } else {
          console.log('Ignoring unrecognized option: ', property);
        }
      }
    }
  }
  // const run = o.run.replace(/\s/g, '');

  if (o.host || o.h || o.url) {
    const host = (o.host || o.h || o.url).replace(/\s/g, '');
    const overrides = {
      localhost: 'http://localhost:3000',
      staging: 'http://folio-staging.aws.indexdata.com',
      testing: 'http://folio-testing.aws.indexdata.com',
      host,
    };
    config.url = overrides[host] || overrides.host;
  }
  config.test_timeout = o.testtimeout || o.tto || config.test_timeout;
  config.login_wait = o.loginwait || config.login_wait;
  config.debug_sleep = o.debugsleep || o.sleep || config.debug_sleep;
  config.console_logs = o.consolelogs || config.console_logs;
  config.username = o.username || o.un || config.username;
  config.password = o.password || o.pw || config.password;
  if (o.show) {
    config.nightmare.show = true;
  }
  if (o.devtools) {
    config.nightmare.openDevTools = { mode: 'detach' };
    config.nightmare.show = true;
  }
  config.nightmare.width = o.width || config.nightmare.width;
  config.nightmare.height = o.height || config.nightmare.height;
  config.nightmare.typeInterval = o.typeinterval || config.nightmare.typeInterval;
  config.nightmare.gotoTimeout = o.gototimeout || o.gto || config.nightmare.gotoTimeout;
  config.nightmare.executionTimeout = o.executiontimeout || o.eto || config.nightmare.executionTimeout;
  config.nightmare.waitTimeout = o.waittimeout || o.wto || config.nightmare.waitTimeout;
  return o;
}

if (options.run) {
  const o = getOptions(options, config); // Mutates the config

  if (o.host || o.h || o.url) console.log(`Host:          ${config.url}`);
  if (o.testtimeout || o.tto) console.log(`Test timeout:  ${config.test_timeout}`);
  if (o.gototimeout || o.gto) console.log(`Goto timeout:  ${config.nightmare.gotoTimeout}`);
  if (o.waittimeout || o.wto) console.log(`Wait timeout:  ${config.nightmare.waitTimeout}`);
  if (o.executiontimeout || o.eto) console.log(`Exec timeout:  ${config.nightmare.executionTimeout}`);
  if (o.loginwait) console.log(`Login wait:    ${config.login_wait}`);
  if (o.debugsleep || o.sleep) console.log(`Debug sleep:   ${config.debug_sleep}`);
  if (o.username || o.un) console.log(`Username:      ${config.username}`);
  if (o.typeinterval) console.log(`Type interval: ${config.nightmare.typeInterval}`);
  if (o.consolelogs) console.log(`Console logs:  ${config.console_logs}`);

  const apps = o.run.split('/'); // find modules to test

  for (let a = 0; a < apps.length; a++) { // for each module in argv
    const appscripts = apps[a];

    if (appscripts.length > 0) {
      let app = '';
      let scripts = [];
      if (appscripts.indexOf(':') == -1) { // no scripts requested, run main ("test.js")
        app = appscripts;
        scripts.push('test');
      } else { // get scripts
        app = appscripts.substring(0, appscripts.indexOf(':'));
        scripts = appscripts.substring(appscripts.indexOf(':') + 1).split(',');
        let runMain = true;
        for (let s = 0; s < scripts.length; s++) {
          if (scripts[s].length > 0) {
            runMain = false;
          }
        }
        if (runMain) {
          console.log(`No scripts found after script indicator ":", running main ("test.js") for module "${app}"`);
          scripts[0] = 'test';
        }
      }

      let emptyScriptArg = false;
      for (let j = 0; j < scripts.length; j++) { // for each test script requested from the module
        const script = scripts[j];
        if (script) {
          try {
            const tests = require(`@folio/${app}/test/ui-testing/${script}.js`);
            const moduleInfo = require(`@folio/${app}/package.json`);
            const meta = { testVersion: `${moduleInfo.name}:${moduleInfo.version}` };
            try {
              tests.test({ config, helpers, meta });
            } catch (e) {
              console.log(`Could not run tests for module "${app}"\n`, e);
            }
          } catch (e) {
            console.log(`Module or test script not found: "${app}${script == 'test' ? '' : `:${script}`}"\n`, e);
          }
        } else {
          emptyScriptArg = true;
        }
      }
      if (emptyScriptArg) {
        console.log(`Found empty script argument(s) for "${app}". Skipped.`);
      }
    }
  }
} else {
  showHelp();
}
