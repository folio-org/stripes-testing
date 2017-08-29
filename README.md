# Regression tests for FOLIO UI

Copyright (C) 2017 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## About FOLIO UI Tests

The tests are using the [nightmarejs](http://www.nightmarejs.org) browser automation library,
and [mocha](https://mochajs.org) for the tests itself.

Some tests are contained within ui-testing itself while others live in the invidual UI modules and can be executed from there by ui-testing. 

## install node packages first

    $ yarn install

## run the main tests with default user/pw/url/debug level

    $ yarn test
    
### run individual tests contained in ui-testing
 
    $ ./node_modules/.bin/mocha test/checkout.js   # runs the checkout test that visits a number of apps on the platform

or (if definded in package.json)

    $ yarn test-checkout
    
### run tests from a UI module

#### run all of a UI module's tests

    $ yarn test-module -- -o --run=users    # runs all tests from the users module

#### run individual tests from a UI module

    $ yarn test-module -- -o --run=users:new_user  # runs the new-user tests from the users module

to view these options for running UI module tests

    $ yarn test-module

to list pre-defined tests

    $ yarn run

## optional: environment variables to modify tests

set username/password to something different from the default:

    export FOLIO_UI_USERNAME=diku_admin
    export FOLIO_UI_PASSWORD=admin

run against a different Stripes service:

    export FOLIO_UI_URL=http://localhost:3000

or

    # headless browser test / command line
    $ FOLIO_UI_DEBUG=0 yarn test

    # with browser window on a desktop machine
    $ FOLIO_UI_DEBUG=1 yarn test

    # with browser window + debug console
    $ FOLIO_UI_DEBUG=2 yarn test

Nightmare debug options:

    $ DEBUG=nightmare yarn test
    $ DEBUG=nightmare* yarn test
    $ DEBUG=nightmare:actions* yarn test
    $ DEBUG=nightmare:*,electron:* yarn test


All options in one:

    $ FOLIO_UI_URL="http://folio-uidemo.aws.indexdata.com" DEBUG=nightmare FOLIO_UI_DEBUG=2 yarn test

## Choose the source of UI module tests to run

When running a UI module's own test suites from ui-testing, there are three potential sources for the actual version of the module, whose tests are being pulled in and executed:

* FOLIO's release repository: npm-folio at repository.folio.org. This is appropriate for testing a stable FOLIO platform, built with npm released versions of UI modules. The package.json of ui-testing controls which releases are installed, and those releases should match the releases in the live service. 
* FOLIO's continuous integration repository: npm-folioci at repository.folio.org. This is appropriate for regression tests and continuous integration. This would also suit developers who are programming test suites or UI modules and want to test very the latest developments. 
* A local checkout of the UI module, brought into ui-testing by yarn link or similar. This could be for developers programming test suites for a UI module and wanting to execute the test scripts with local changes.   

#### Run UI module tests against a stable FOLIO service

    npm config set @folio:registry https://repository.folio.org/repository/npm-folio/
    rm yarn.lock
    yarn install
    
    export FOLIO_UI_URL=http://folio-stable/
    
    yarn test-module -- -o --run=users
    
#### Run UI module tests against a FOLIO service with the latest commits

    npm config set @folio:registry https://repository.folio.org/repository/npm-folio/
    rm yarn.lock
    yarn install
    
    export FOLIO_UI_URL=http://folio-testing/
    
    yarn test-module -- -o --run=users
   
## Develop tests for a UI module

For ui-testing to run a UI module's own tests individually or as part of an overall test suite, the UI module should contain scripts with Nightmare tests that takes one argument (with the test context, see below).

While tests scripts could be placed anywhere in the module's source structure, ui-testing will be looking for a main test script in, say, the Users module, at /ui-users/test/ui-testing/test.js

This test script would probably contain references to all the individual tests that the module developers intend to get included in the overall test suite.

This is an example of a minimal test that logs in and evaluates if a module named 'app' opens:

    module.exports.test = function(uiTestCtx) {
      describe('Module test: app:minimal', function() {
        const { config, helpers: { login, openApp, logout }, meta: { testVersion } } = uiTestCtx;
        const nightmare = new Nightmare(config.nightmare);

        this.timeout(Number(config.test_timeout));

        describe('Login > Open module "Requests" > Logout', () => {
          before( done => {
            login(nightmare, config, done);  // logs in with the default admin credentials
          })
          after( done => {
            logout(nightmare, config, done);
          })
          it('should open module "Requests" and find version tag ', done => {
            nightmare
            .use(openApp(nightmare, config, done, 'app', testVersion))
            .then(result => result )
          })
        })
      })

This script might be invoked from test.js:

      const minimal = require('./minimal.js');
      const extensive = require('./extensive.js');

      module.exports.test = function(uiTestCtx) {
        minimal.test(uiTestCtx);
        extensive.test(uiTestCtx);
      }

The test context passed to the module's test from ui-testing has following content at the time of writing:

      {
       config :  (see ui-testing/folio-ui.config.js)
       helpers: {  
         login:    function for logging in to the FOLIO app
         logout,
         openApp:   function for opening a module's page
         namegen:  function for generating user names and addresses
       }
       meta:  {
         testVersion:  the npm version of the module that the test is pulled from
       }
      }

  NOTE: This is the first version of the context and it is subject to change. 

The Nightmare instance is extended with the actions documented below (xnigthmare.js) and the context contains the helper for generated random user names and addresses also documented below.

#### Developing a UI module and the UI tests to go with it

Sometimes developers might update the UI and the tests scripts at the same time, for instance to ensure that tests still pass after changing the structure or functionality of the UI. 

For that they would conventionally 

     * check out ui-testing and install it from the npm-folioci repository
     * check out a Stripes platform to run the UI module in locally
     * check out the UI module in question 
     * yarn link the UI module into both ui-testing and the local Stripes platform. 

## The context passed from ui-testing to the UI module test suites

### xnightmare.js

    The Xnightmare.js file extends nightmare by adding actions that use XPath as a node selector.
    So far there are only two actions contained in this file: 
    
#### .xclick(xpath) 

    Does the same as .click but takes an XPath instead of a CSS selector as an argument.

#### .xtract(xpath)

    This will extract and return the textContent of an XPath node.
    The returned value will be passed to the next action in the chain (most likely .then)
    
### namegen.js

    This script creates random user data (100 possibilities.)
    Returns: id, firstname, lastname, email, barcode, password

```js
    const Nightmare = require('nightmare')
    const assert = require('assert')
    const config = require('../folio-ui.config.js')
    const names = require('../namegen.js')
    const user = names.namegen()
    
    ...
    
    it('should create a user: ' + user.id + '/' + user.password, done => {
      nightmare
      .type('#adduser_username',user.id)
      .type('#pw',user.password)
      .click('#useractiveYesRB')
      .type('#adduser_firstname',user.firstname)
      .type('#adduser_lastname',user.lastname)
      .type('#adduser_email', user.email)
      .type('#adduser_barcode',user.barcode)
      .click('#clickable-createnewuser')
      .wait('#clickable-newuser')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
```
### openApp 

    The function openApp is found in the helpers object of the test context passed to the UI module's test suites. This function will look for the UI modules ID in the page and open the page. 
    If the UI module test passes info about the version of the test being run, openApp will log the version of the test and as well as the version of the module under test.

    For example, in a module's test script just after log-in:
    
       nightmare
         .use(openApp(nightmare, config, done, 'checkout', testVersion ))

    Output in the test log:
    
        Module test: checkout:error_messages.
        Open app > Trigger error messages > Logout
          Test suite   @folio/checkout:1.0.10020
          Live module  @folio/checkout:1.0.10019 (http://folio-testing

    The module test script can get the test version from the object meta in the test context. 
