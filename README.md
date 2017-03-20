# Regression tests for Folio UI

Copyright (C) 2017 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## install node packages first

    $ yarn install

## set username/password for testing

    export FOLIO_UI_USERNAME=diku_admin 
    export FOLIO_UI_PASSWORD=admin
    export FOLIO_UI_DEBUG=2

    $ yarn test

or

    $ FOLIO_UI_DEBUG=0 yarn test
    $ FOLIO_UI_DEBUG=1 yarn test
    $ FOLIO_UI_DEBUG=2 yarn test
  
--
March 2017



