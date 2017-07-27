# Regression tests for FOLIO UI

Copyright (C) 2017 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## About FOLIO UI Tests

The tests are using the [nightmarejs](http://www.nightmarejs.org) browser automation library,
and [mocha](https://mochajs.org) for the tests itself.


## install node packages first

    $ yarn install

## run the tests with default user/pw/debug level

    $ yarn test
    
## run individual tests
 
    $ ./node_modules/.bin/mocha test/new_item.js   # runs the new-item test

or (if definded in package.json)

    $ yarn test-new-item
    
to list pre-defined tests

    $ yarn run

    The test log will show, for each test, the script or predefined command to execute in order to repeat individual tests:

    $ Load a Page ("test-simple")

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
    
## xnightmare.js

    The Xnightmare.js file extends nightmare by adding actions that use XPath as a node selector.
    So far there are only two actions contained in this file: 
    
#### .xclick(xpath) 

    Does the same as .click but takes an XPath instead of a CSS selector as an argument.

#### .xtract(xpath)

    This will extract and return the textContent of an XPath node.
    The returned value will be passed to the next action in the chain (most likely .then)
    
## namgen.js

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
      .click('button[title="Create New User"]')
      .wait('.button---2NsdC')
      .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
      .then(result => { done() })
      .catch(done)
    })
```

