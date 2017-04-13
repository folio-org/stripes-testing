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

    # a single test
    $ ./node_modules/.bin/mocha test/100-startpage.js

Nightmare debug options:

    $ DEBUG=nightmare yarn test
    $ DEBUG=nightmare* yarn test
    $ DEBUG=nightmare:*,electron:* yarn test


All options in one:

    $ FOLIO_UI_URL="http://folio-uidemo.aws.indexdata.com" DEBUG=nightmare FOLIO_UI_DEBUG=2 yarn test

