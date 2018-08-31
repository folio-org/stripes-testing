# stripes-testing

Copyright (C) 2017-2018 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## Introduction

Stripes-testing is a toolkit for running tests against Stripes UI modules and platforms.  It is based on FOLIO's centralized [ui-testing](https://github.com/folio-org/ui-testing) repo, with the notable omission of app dependencies and tests.  Tests themselves exist within the corresponding app or platform that they exercise.

Stripes UI modules are tested with BigTest and Nightmare.  The former is primarily used for unit tests and the latter for integration tests.  Refer to the following documents for details on using each framework within FOLIO.

* Unit tests with [BigTest](doc/bigtest.md)
* Integration tests with [Nightmare](doc/nightmare.md)

## Issues

See project [UITEST](https://issues.folio.org/browse/UITEST)
at the [FOLIO issue tracker](https://dev.folio.org/guidelines/issue-tracker).
