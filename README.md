# stripes-testing

Copyright (C) 2017-2020 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## Introduction

stripes-testing is a toolkit for building integration tests against Stripes
UI modules and platforms. There are no tests in this repository;
instead they exist in the platforms they exercise (e.g. platform-core).
Tests that operate only a single app (unit tests) should be written with
the [BigTest](https://github.com/folio-org/stripes/blob/master/doc/bigtest.md)
toolkit instead.

- [TL;DR](#tldr-i-just-want-to-run-some-tests)
- [Stripes Component Interactors](doc/interactors.md)
- [Prerequisites](#prerequisites)
- [Choose the source of UI module tests to run](#choose-the-source-of-ui-module-tests-to-run)
- [Writing tests](#writing-tests)

## TL;DR I just want to run some tests

To run the tests for a platform, clone the platform and checkout its `snapshot`
branch, install its dependencies with `yarn`, then run the tests. For example,
for platform-core:

```
git clone git@github.com:folio-org/platform-core.git
cd platform-core
git checkout snapshot
yarn
yarn prepare
yarn test-int
```

This will start stripes at http://localhost:3000, run the platform's tests, and
quit stripes.

## Prerequisites

- [Node.js](https://nodejs.org/) with an [active LTS version](https://github.com/nodejs/Release#release-schedule)
- [Yarn](https://yarnpkg.com/) JavaScript package manager

## Choose the source of UI module tests to run

When building the platform, there are three potential sources for an
application module and its tests:

- FOLIO's continuous integration repository: `npm-folioci` at repository.folio.org.
  Modules in this repository reflect the head-of-master, i.e. code that has been
  committed but is not yet part of an official release. This is appropriate for
  regression tests and continuous integration. This would also suit developers
  who are programming test suites or UI modules, and want to test very the latest
  developments.

  This is the default source for `platform-core#snapshot`.

- Folio's release repository: `npm-folio` at repository.folio.org.
  Modules in this repository reflect officially released code.

  This is the default source for `platform-core#master`.

- A local checkout of a module, brought into the platform by building it in
  a [workspace](https://github.com/folio-org/stripes-cli/blob/master/doc/user-guide.md).

Change a platform's source for its modules with the `npm config` command:

```
npm config set @folio:registry https://repository.folio.org/repository/npm-folio/
```

## Writing Tests

- Write [integration tests for a platform](doc/nightmare.md) with Nightmare
- Write [unit tests for an app](https://github.com/folio-org/stripes/blob/master/doc/bigtest.md) with BigTest

## Additional information

See project [UITEST](https://issues.folio.org/browse/UITEST)
at the [FOLIO issue tracker](https://dev.folio.org/guidelines/issue-tracker).

Other FOLIO Developer documentation is at [dev.folio.org](https://dev.folio.org/)
