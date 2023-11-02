# Nightmare for FOLIO UI

- [Develop tests for a UI module](#develop-tests-for-a-ui-module)
- [The test context object](#the-test-context-object)
- [helpers](#helpers)
- [namegen (helpers.js)](#namegen-helpersjs)
- [openApp (helpers.js)](#openapp-helpersjs)
- [Writing testable code](#writing-testable-code)
  - [Provide unique identifiers on UI elements](#provide-unique-identifiers-on-ui-Elements)
- [Writing robust tests](#writing-robust-tests)
  - [Avoid timers](#avoid-timers)
  - [Do not manipulate the DOM in `evaluate`](#do-not-manipulate-the-dom-in-evaluate)
  - [Do not use XPath](#do-not-use-xpath)
  - [Extract text from the DOM using .evaluate()](#extract-text-from-the-dom-using-evaluate)
  - [Waiting for text in the DOM](#waiting-for-text-in-the-dom)
  - [Be careful with barcodes](#be-careful-with-barcodes)
  - [Be careful with `<MultiSelection>`](#be-careful-with-multiselection)

## Develop tests for a UI module

To run an application's regression tests from a platform as part of a suite, the
application must include them

In order for stripes-testing to be able to run a UI module's own tests
individually or as part of an overall test suite, the UI module must include
them in the file `test/ui-testing/test.js`. Each test should contain a script
that takes a single argument holding all the test context (see below).

This is an example of a minimal test that logs in and evaluates if a module
named 'app' opens:

```js
module.exports.test = function (uiTestCtx) {
  describe('Module test: app:minimal', function () {
    const {
      config,
      helpers: { login, openApp, logout },
      meta: { testVersion },
    } = uiTestCtx;
    const nightmare = new Nightmare(config.nightmare);

    describe('Login > Open module "App" > Logout', () => {
      before((done) => {
        login(nightmare, config, done); // logs in with the default admin credentials
      });

      after((done) => {
        logout(nightmare, config, done);
      });

      it('should open module "App" and find version tag ', (done) => {
        nightmare
          .use(openApp(nightmare, config, done, 'app', testVersion))
          .then((result) => result);
      });
    });
  });
};
```

This script might be invoked from `test/ui-testig/test.js`:

```js
const minimal = require('./minimal.js');
const extensive = require('./extensive.js');

module.exports.test = function (uiTestCtx) {
  minimal.test(uiTestCtx);
  extensive.test(uiTestCtx);
};
```

## The test context object

The test context passed to the module's test from stripes-testing has following
content at the time of writing:

      {
       config :  (see folio-ui.config.js)
       helpers: {
         login:    function for logging into Stripes
         logout:   function for logging out of Stripes
         openApp:  function for opening a specified module's page
         getUsers: function that returns an array of currently listed users
         createInventory: function that creates inventory, holdings and item records
         namegen:  function for generating user names and addresses
         circSettingsCheckoutByBarcodeAndUsername: function for configuring checkout
       }
       meta:  {
         testVersion:  the npm version of the module that the test is pulled from
       }
      }

## namegen (helpers.js)

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

## openApp (helpers.js)

openApp is a helper function that will open the page of a given UI module.
If the test script passes its version to openApp, then openApp will log the
version of the test as well as the version of the module under test.

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
  Live module  @folio/checkout:1.0.10019 (https://folio-testing.dev.folio.org)
```

## Writing testable code

### Provide unique identifiers on UI elements

Test scripts are both easier to write and read if unique IDs have been assigned
to crucial elements of the UI.

Stripes will assign certain IDs out of the box that the test script can use:

     The module's menu bar button:  #clickable-users-module
     The module's page:             #users-module-display
     The login button:              #clickable-login
     The logout button:             #clickable-logout

Beyond that the UI module developer should assign IDs to actionable UI elements at least.

The following conventions are suggested:

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
it('should show error when scanning item before patron card', (done) => {
  nightmare
    .wait('#clickable-checkout-module')
    .click('#clickable-checkout-module')
    .wait('#input-item-barcode')
    .insert('#input-item-barcode', 'some-item-barcode')
    .wait('#clickable-add-item')
    .click('#clickable-add-item')
    .wait('#section-patron div[class^="textfieldError"]')
    .evaluate(function () {
      var errorText = document.querySelector(
        '#section-patron div[class^="textfieldError"]',
      ).innerText;
      if (!errorText.startsWith('Please fill')) {
        throw new Error('Error message not found for item entered before patron found');
      }
    })
    .then(done)
    .catch(done);
});
```

## Writing robust tests

Nightmare tests are fussy. A few guidelines can go a long way toward writing
robust tests that succeed regardless of the environment they run in or the speed
of the internet connection they have access to.

### Avoid timers

React's tendency to render a page multiple times can work against the way Nightmare
tests operate because Nightmare may begin interacting with the page as soon as it
renders the first time. Avoid the temptation to use timers, e.g. `.wait(1000)`,
to wait for the page to "settle down"; at best this strategy is unreliable because
it so environmentally dependent. Instead, `.wait()` for specific elements to appear
before interacting with them. For example,

```js
.wait('#some-button-id')
.click('#some-button-id')
```

### Do not manipulate the DOM in `evaluate()`

Code in a Nightmare test either operates in the scope of the test or the scope
of the browser. You can read from the DOM in browser-scope but you should not
interact with the DOM in browser scope. Nightmare behaves poorly when you
manipulate the DOM behind its back, e.g. by clicking a link in a function
passed to `evaluate()`. Nightmare really wants to own all the clicks. When it
doesn't, tests may become mysteriously interleaved as though they are running
in parallel instead of in series, and some will never return, lost in some
Neverneverland of parllel execution.

In short, treat `evaluate()` as a tool for extracting values to construct a
CSS selector you can pass to Nightmare; do not use it to manipulate the DOM.

When looking for an item on a list, `findIndex` is your friend as you can pass
the value back to Nightmare for use in an `:nth-of-type(${theIndex})` selector.
Just remember that JavaScript uses 0-based arrays and CSS uses 1-based arrays
so you have to add one to the return value to find the right element.

### Do not use XPath

Along these lines, be careful with XPath queries. Use them to extract text
from the DOM but not to interact with it, i.e. avoid helper functions like
`xclick` as they appear to have harmful side-effects.

### Extract text from the DOM using .evaluate()

`.evaluate(fx, av1, ... avn)` accepts a function and a list of argument to pass
to the function, and returns a Promise. You can use this feature to extract text
from the DOM by passing a function that parses the DOM and returns a value. This
example from platform-core's loan-renewal test gets the index of an anchor on
the page, e.g. `<a href='some-link'>some text</a>`, given `some text` and then
uses that index to click the link.

```js
evaluate((pn) => {
  const index = Array.from(
    document.querySelectorAll('#ModuleContainer div.hasEntries a div')
  )
    .findIndex(e => e.textContent === pn);

  if (index === -1) {
    throw new Error(`Could not find the loan policy ${pn} to edit`);
  }

  // CSS selectors are 1-based, which is just totally awesome.
  return index + 1;
}, policyName)
.then((entryIndex) => {
  nightmare
    .wait(`#ModuleContainer div.hasEntries a:nth-of-type(${entryIndex})`)
    .click(`#ModuleContainer div.hasEntries a:nth-of-type(${entryIndex})`)
    ...
```

### Waiting for text in the DOM

You can wait for text to appear on the page by passing a function to `.wait()`
in much the same way you can extract text by passing a function to `.evaluate()`:

```js
const contentWait = (string) => {
  return !!Array.from(document.querySelectorAll('#list-inventory div[role="row"] > a > div')).find(
    (e) => `${string}` === e.textContent,
  );
};
```

### Be careful with barcodes

Barcodes tend to look like numbers to JavaScript, but in many cases they need to
be treated like strings. Use string interpolation to force string context:

```js
if (e.textContent === `${fbarcode}`)
```

### Be careful with `<MultiSelection>`

[`<MultiSelection>`](https://github.com/folio-org/stripes-components/blob/master/lib/MultiSelection/)
is basically a `<select multiple>`, except it's a _really nice_
`<select multiple>`. It renders HTML roughly like this:

```
<div role="listbox">
  <ul>
    <li role="option">
      <div class="optionSegment---23qMO">Monkey bagel</div>
      <div>+</div>
    </li>
  </ul>
</div>
```

There are two important things to know about `<MultiSelection>`:

1. It renders the `<div>` containing its list of options to different parent
   elements depending on the width of the screen: on a narrow screen <= 800px,
   it uses a portal and renders them under an `#OverlayContainer`; on a wider
   screen it renders them inline in the DOM under the component containing the
   `<MultiSelection>` element.
2. That `<div>` is hidden by default by way of the `hidden` attribute.

And there is one important thing to know about Nightmare in this context:

1. Nightmare's default width is 800px.

This means the _only_ way to distinguish whether an option
belongs to the currently active `<MultiSelection> ` is the _absence_ of
`hidden` on the `[role=listbox]` element. See [ui-inventory PR #828](https://github.com/folio-org/ui-inventory/pull/828)
for details.
