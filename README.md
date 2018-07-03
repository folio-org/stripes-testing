# Regression tests for FOLIO UI

Copyright (C) 2017-2018 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

<!-- md2toc -l 2 -h 3 README.md -->
* [About FOLIO UI Tests](#about-folio-ui-tests)
* [Install node packages first](#install-node-packages-first)
* [Run the main tests with default user/password/URL/debug-level](#run-the-main-tests-with-default-userpasswordurldebug-level)
* [Run individual tests contained in ui-testing](#run-individual-tests-contained-in-ui-testing)
* [Run tests from a UI module](#run-tests-from-a-ui-module)
    * [Run all of a UI module's tests](#run-all-of-a-ui-modules-tests)
    * [Run individual tests from a UI module](#run-individual-tests-from-a-ui-module)
* [Optional: environment variables to modify tests](#optional-environment-variables-to-modify-tests)
* [Alternative for module tests: use command line arguments](#alternative-for-module-tests-use-command-line-arguments)
* [Choose the source of UI module tests to run](#choose-the-source-of-ui-module-tests-to-run)
    * [Run UI module tests against a stable FOLIO service](#run-ui-module-tests-against-a-stable-folio-service)
    * [Run UI module tests against a FOLIO service with the latest commits](#run-ui-module-tests-against-a-folio-service-with-the-latest-commits)
* [Develop tests for a UI module](#develop-tests-for-a-ui-module)
    * [The test context object](#the-test-context-object)
    * [xnightmare.js](#xnightmarejs)
    * [namegen (helpers.js)  ](#namegen-helpersjs--)
    * [openApp (helpers.js)](#openapp-helpersjs)
    * [Developing a UI module together with its UI tests](#developing-a-ui-module-together-with-its-ui-tests)
    * [Support test scripting with unique identifiers on UI elements](#support-test-scripting-with-unique-identifiers-on-ui-elements)
* [Manage ui-testing versions](#manage-ui-testing-versions)
* [Additional information](#additional-information)


## About FOLIO UI Tests

The tests are using the [NightmareJS](http://www.nightmarejs.org) browser automation library,
and [Mocha](https://mochajs.org) for the tests itself.

Some tests are contained within ui-testing itself while others live in the individual UI modules, and can be executed from there by ui-testing.
## Pre-requisite on linux( Ubuntu and AWS at least...possibly others)
You may need to install supporting libraries for Electron(Nightmare uses electron to execute browser tests).

Detailed instructions can be found here:  [Running nightmare on AWS](https://gist.github.com/dimkir/f4afde77366ff041b66d2252b45a13db#attempt-to-run-nightmare)

To immediately find out if you need to install dependencies execute:  
```
$ cd node_modules/nigthmare/node_modules/electron/dist
$ ldd electron  | grep 'not found'
```
## Install node packages first

    $ yarn install

## Run the main tests with default user/password/URL/debug-level

    $ yarn test

## Run individual tests contained in ui-testing

    $ ./node_modules/.bin/mocha test/checkout.js   # runs the checkout test that visits multiple apps

or (if defined in package.json)

    $ yarn test-checkout

to list pre-defined tests

    $ yarn run

## Run tests from a UI module

### Run all of a UI module's tests

    $ yarn test-module -- -o --run=users    # runs all tests in test.js from the users module

### Run individual tests from a UI module

    $ yarn test-module -- -o --run=users:new_user  # runs the new-user tests from the users module

to view options for running UI module tests

    $ yarn test-module

## Optional: environment variables to modify tests

set username/password to something different from the default:

    export FOLIO_UI_USERNAME=diku_admin
    export FOLIO_UI_PASSWORD=admin

run against a different Stripes service:

    export FOLIO_UI_URL=http://localhost:3000

or

    # Wait for up to 10 seconds for each action, not the 30s default
    $ FOLIO_UI_WAIT_TIMEOUT=10000 yarn test

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

`nightmare:actions*` logs each browser-driving action as it happens, so it's easier to see what's happened when something goes wrong.

All options in one:

    $ FOLIO_UI_URL="http://folio-uidemo.aws.indexdata.com" DEBUG=nightmare FOLIO_UI_DEBUG=2 yarn test


See [folio-ui.config.js](https://github.com/folio-org/ui-testing/blob/master/folio-ui.config.js) for current environment variables.

## Alternative for module tests: use command line arguments

run a module's test in browser against localhost:3000

    $ yarn test-module -- -o --show --h=localhost --run=checkout:error_messages

A command line argument overrides the corresponding environment variable.

To see all command line options:

    $ yarn test-module


## Choose the source of UI module tests to run

When running a UI module's own test suites from ui-testing, there are three potential sources for the actual version of the module and its tests:

* FOLIO's release repository: npm-folio at repository.folio.org. This is appropriate for testing a stable FOLIO platform, built with npm released versions of UI modules. The package.json of ui-testing controls which releases are installed, and those releases should match the releases in the live service.
* FOLIO's continuous integration repository: npm-folioci at repository.folio.org. This is appropriate for regression tests and continuous integration. This would also suit developers who are programming test suites or UI modules, and want to test very the latest developments.
* A local checkout of the UI module, brought into ui-testing by 'yarn link' or similar. This could be for developers programming test suites for a UI module and wanting to execute the test scripts with local changes.

### Run UI module tests against a stable FOLIO service

Install tests from release repository

    npm config set @folio:registry https://repository.folio.org/repository/npm-folio/
    rm yarn.lock
    yarn install

Then run the tests against a service built on releases, for example the folio-staging service

    export FOLIO_UI_URL=http://folio-staging.aws.indexdata.com/
    yarn test-module -- -o --run=users

or run the same with command line arguments

    yarn test-module -- -o --host=staging --run=users

### Run UI module tests against a FOLIO service with the latest commits

Install tests from continuous integration repository

    npm config set @folio:registry https://repository.folio.org/repository/npm-folioci/
    rm yarn.lock
    yarn install

Then run the tests against the folio-testing service, also based on the continuous integration repository:

    export FOLIO_UI_URL=http://folio-testing.aws.indexdata.com/    # The current default URL for testing
    yarn test-module -- -o --run=users

or run the same with command line arguments

    yarn test-module -- -o --host=testing --run=users


## Develop tests for a UI module

In order for ui-testing to be able to run a UI module's own tests individually or as part of an overall test suite, the UI module should contain scripts with Nightmare tests that take one argument holding all of the test context (see below).

While test scripts could be placed anywhere in the module's source structure, ui-testing will be looking for a main test script in, say, the Users module, at /ui-users/test/ui-testing/test.js

This test script would probably contain references to all the individual tests that the module developers intend to get included in the overall test suite.

This is an example of a minimal test that logs in and evaluates if a module named 'app' opens:

```js
module.exports.test = function(uiTestCtx) {
  describe('Module test: app:minimal', function() {
    const { config, helpers: { login, openApp, logout }, meta: { testVersion } } = uiTestCtx;
    const nightmare = new Nightmare(config.nightmare);

    this.timeout(Number(config.test_timeout));

    describe('Login > Open module "App" > Logout', () => {
      before( done => {
        login(nightmare, config, done);  // logs in with the default admin credentials
      })
      after( done => {
        logout(nightmare, config, done);
      })
      it('should open module "App" and find version tag ', done => {
        nightmare
        .use(openApp(nightmare, config, done, 'app', testVersion))
        .then(result => result )
      })
    })
  })
}
```

This script might be invoked from test.js:

```js
      const minimal = require('./minimal.js');
      const extensive = require('./extensive.js');

      module.exports.test = function(uiTestCtx) {
        minimal.test(uiTestCtx);
        extensive.test(uiTestCtx);
      }
```

### The test context object

The test context passed to the module's test from ui-testing has following content at the time of writing:

      {
       config :  (see folio-ui.config.js)
       helpers: {
         login:    function for logging into Stripes
         logout:   function for logging out of Stripes
         openApp:  function for opening a specified module's page
         getUsers: function that returns an array of currently listed users
         createInventory: function that creates inventory, holdings and item records
         namegen:  function for generating user names and addresses
       }
       meta:  {
         testVersion:  the npm version of the module that the test is pulled from
       }
      }

NOTE: This is the first version of the context and it is subject to change.

### xnightmare.js

The xnightmare.js file extends nightmare by adding actions that use XPath as a node selector.
So far there are only two actions contained in this file:

#### .xclick(xpath)

Does the same as .click but takes an XPath instead of a CSS selector as an argument.

#### .xtract(xpath)

This will extract and return the textContent of an XPath node.
The returned value will be passed to the next action in the chain (most likely .then).

### namegen (helpers.js)

This script creates random user data (100 possibilities).
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

### openApp (helpers.js)

openApp is a helper function that will open the page of a given UI module.
If the test script passes it's version to openApp, then openApp will log the version of the test
as well as the version of the module under test.

The UI module can find 'openApp' in 'helpers' and its own version in 'meta'.

For example:

```
const { config, helpers: { namegen, openApp }, meta: { testVersion } } = uiTestContext;
   ...
   ...
   nightmare
     .use(openApp(nightmare, config, done, 'checkout', testVersion ))
```

Output in the test log:

```
Module test: checkout:error_messages.
Open app > Trigger error messages > Logout
  Test suite   @folio/checkout:1.0.10020
  Live module  @folio/checkout:1.0.10019 (http://folio-testing.aws.indexdata.com)
```

### Developing a UI module together with its UI tests

Sometimes developers might update the UI and the tests scripts at the same time, for instance to ensure that tests still pass after changing the structure or functionality of the UI.

For that they would conventionally do this:

     * check out ui-testing and install it from the npm-folioci repository
     * check out a Stripes platform to run the UI module in locally
     * check out the UI module in question
     * yarn link the UI module into both ui-testing and the local Stripes platform.

### Support test scripting with unique identifiers on UI elements

Test scripts are both easier to write and read if unique IDs have been assigned to crucial elements of the UI.

Stripes will assign certain IDs out of the box that the test script can use:

     The module's menu bar button:  #clickable-users-module
     The module's page:             #users-module-display
     The login button:              #clickable-login
     The logout button:             #clickable-logout

Beyond that the UI module developer should assign IDs to actionable UI elements at least.

Following conventions are suggested:

     Controls/links that can be clicked:   #clickable-add-user
     Elements for entering data:           #input-user-name
     Lists of data:                        #list-users
     Section of a page:                    #section-loans-history

Examples of identifiers in a UI:

     <Row id="section-patron" ...
     <Field id="input-patron-identifier" ...
     <Button id="clickable-find-patron" ...
     <MultiColumnList id="list-patrons" ...
     <Row id="section-item" ...
     <Field id="input-item-barcode" ...
     <Button id="clickable-add-item" ...
     <MultiColumnList id="list-items-checked-out" ...
     <Button id="clickable-done" ...

and usage in a test script:

```js
it('should show error when scanning item before patron card', done => {
  nightmare
  .wait('#clickable-checkout-module')
  .click('#clickable-checkout-module')
  .wait('#input-item-barcode')
  .insert('#input-item-barcode',"some-item-barcode")
  .wait('#clickable-add-item')
  .click('#clickable-add-item')
  .wait('#section-patron div[class^="textfieldError"]')
  .evaluate(function() {
    var errorText = document.querySelector('#section-patron div[class^="textfieldError"]').innerText;
    if (!errorText.startsWith("Please fill")) {
      throw new Error("Error message not found for item entered before patron found");
    }
  })
  .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 555) // debugging
  .then(result => { done() })
  .catch(done)
})
```
## Manage ui-testing versions
We maintain versions of ui-testing itself for the purpose of testing specific builds of FOLIO platforms based entirely on NPM released components.

When a stable FOLIO platform build is made that passes the ui-testing test suite, we lock down that version of the test suite like this:

    $ npm config set @folio:registry https://repository.folio.org/repository/npm-folio/
    $ rm yarn.lock
    $ yarn install

Run the tests against the platform build to verify that they pass. If they do not, we are not yet ready to tag a version of ui-testing for the platform build. If they do, proceed with the versioning:

Add the newly generated yarn.lock to git and commit it with a commit message referring to the version of the platform build, for instance:

    $ git add yarn.lock
    $ git commit -m "Add yarn.lock v5.0.0"

Tag the commit with a label that indicates the platform build it pertains to, for instance:

    $ git tag "v5.0.0"
    $ git push
    $ git push origin tag "v5.0.0"

Once the version is tagged, the yarn.lock should be removed again. The regular test builds for testing the continuous integration platform should always pick the latest from the CI repository, and should thus not be locked down by yarn.lock. Delete the yarn.lock file from ui-testing, git commit and git push.


## Additional information

See [stripes-core](https://github.com/folio-org/stripes-core)
and other [modules](https://dev.folio.org/source-code/#client-side).

See project [UITEST](https://issues.folio.org/browse/UITEST)
at the [FOLIO issue tracker](https://dev.folio.org/guidelines/issue-tracker).

Other FOLIO Developer documentation is at [dev.folio.org](https://dev.folio.org/)

