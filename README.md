# stripes-testing

Copyright (C) 2017-2019 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## Introduction

stripes-testing is a toolkit for building integration tests against Stripes
UI modules and platforms. There are no tests in this repository;
instead they exist in the platforms they exercise (e.g. platform-core).
Tests that operate only a single app (unit tests) should be written with
the [BigTest](https://github.com/folio-org/stripes/blob/master/doc/bigtest.md)
toolkit instead.

* [TL;DR](#tldr-i-just-want-to-run-some-tests)
* [About Folio UI Tests](#about-folio-ui-tests)
* [Prerequisites](#prerequisites)
* [Nightmare debug options](#nightmare-debug-options)
* [Choose the source of UI module tests to run](#choose-the-source-of-ui-module-tests-to-run)
* [Writing tests](#writing-tests)

## TL;DR I just want to run some tests

To run the tests for a platform, clone the platform and checkout its `snapshot`
branch, install its dependencies with `yarn`, then run the tests. For example,
for platform-core:
```
git clone git@github.com:folio-org/platform-core.git
cd platform-core
git checkout snapshot
yarn
yarn test-int
```
This will start stripes at http://localhost:3000, run the platform's tests, and
quit stripes.


## About Folio UI Tests

The tests are using the [NightmareJS](http://www.nightmarejs.org), a browser
automation library that allows you to script events like `type` and `click`,
and [Mocha](https://mochajs.org) for the tests itself.

The test suite is invoked by the [stripes-cli](https://github.com/folio-org/stripes-cli/)
command [`test nightmare`](https://github.com/folio-org/stripes-cli/blob/master/doc/commands.md#test-nightmare-command).
Customize its behavior by editing the `stripes.config.js` file (or passing an
alternative config file altogether) or by specifying options such as `--run
<some app>` (to select tests other than those in the current directory),
`--okapi <some URL>` (to set a backend other than http://localhost:9130), and
`show` to show Nightmare's Electron browser and dev-tools while the tests are
running.

To run tests from multiple apps, separate them with a forward slash:
```
yarn test-int --run checkout/users/inventory
```
To run tests from the platform and from one or more apps, include the special
app `WD` (think of tests in the "working directory"):
```
yarn test-int --run WD/checkout/users/inventory
```
To run selected tests from an app or platform, rather than ever test included in
the `test/ui-testing/test.js` file, append it to the app with a colon:
```
yarn test-int --run WD:loan-renewal/users:patron-group
```

Refer to the [`stripes-cli test nightmare`](https://github.com/folio-org/stripes-cli/blob/master/doc/commands.md#test-nightmare-command)
documentation for additional details and options.


## Prerequisites

* [Node.js](https://nodejs.org/) with an [active LTS version](https://github.com/nodejs/Release#release-schedule)
* [Yarn](https://yarnpkg.com/) JavaScript package manager

[Running nightmare on AWS](https://gist.github.com/dimkir/f4afde77366ff041b66d2252b45a13db#attempt-to-run-nightmare)
may require additional supporting libraries. Nightmare uses Electron under the
hood and may not install it by default. To immediately find out if you need to
install dependencies, execute:  

```
cd node_modules/nightmare/node_modules/electron/dist
ldd electron  | grep 'not found'
```


## Nightmare debug options

```
DEBUG=nightmare yarn stripes test nightmare stripes.config.js
DEBUG=nightmare* yarn stripes test nightmare stripes.config.js
DEBUG=nightmare:actions* yarn stripes test nightmare stripes.config.js
DEBUG=nightmare:*,electron:* yarn stripes test nightmare stripes.config.js
```

`nightmare:actions*` logs each browser-driving action as it happens, so it's
easier to see what's happened when something goes wrong.


## Choose the source of UI module tests to run

When building the platform, there are three potential sources for an
application module and its tests:

* FOLIO's continuous integration repository: `npm-folioci` at repository.folio.org.
  Modules in this repository reflect the head-of-master, i.e. code that has been
  committed but is not yet part of an official release. This is appropriate for
  regression tests and continuous integration. This would also suit developers
  who are programming test suites or UI modules, and want to test very the latest
  developments.

  This is the default source for `platform-core#snapshot`.

* Folio's release repository: `npm-folio` at repository.folio.org.
  Modules in this repository reflect officially released code.

  This is the default source for `platform-core#master`.

* A local checkout of a module, brought into the platform by building it in
  a [workspace](https://github.com/folio-org/stripes-cli/blob/master/doc/user-guide.md)
  or with a [stripes-cli alias](https://github.com/folio-org/stripes-cli/blob/master/doc/user-guide.md#aliases).

Change a platform's source for its modules with the `npm config` command:
```
npm config set @folio:registry https://repository.folio.org/repository/npm-folio/
```

## Writing Tests

* Write [integration tests for a platform](doc/nightmare.md) with Nightmare
* Write [unit tests for an app](https://github.com/folio-org/stripes/blob/master/doc/bigtest.md) with BigTest

## Additional information

See project [UITEST](https://issues.folio.org/browse/UITEST)
at the [FOLIO issue tracker](https://dev.folio.org/guidelines/issue-tracker).

Other FOLIO Developer documentation is at [dev.folio.org](https://dev.folio.org/)
