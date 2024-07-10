# stripes-testing

Copyright (C) 2017-2024 The Open Library Foundation

This software is distributed under the terms of the Apache License,
Version 2.0. See the file "[LICENSE](LICENSE)" for more information.

## Introduction

stripes-testing is a toolkit for building integration tests against Stripes
UI modules and platforms. This repository contains:

* `accessibility`: axe helper functions
* `bigtest`: BigTest helper furnctions, compatible with React >= 17
* `cypress`: end-to-end tests
* `interactors`: interactors provide "hooks" into components as rendered in the DOM,
  allowing tests written in BigTest, Cypress, etc. to use the interactor's consistent
  API regardless of how the component implementation changes.

- [Stripes Component Interactors](doc/interactors.md)
- [Prerequisites](#prerequisites)

## Running

First, install dependencies with npm or yarn.
* To run all Cypress tests at the CLI, run `npx cypress run`.
* To run a specific Cypress test at the CLI, run `npx cypress run --spec ./path/to/spec.cy.js`
* To open the Cypress test-runner in a browser, run `npx cypress open`.

## Prerequisites

- [Node.js](https://nodejs.org/) with an [active LTS version](https://github.com/nodejs/Release#release-schedule)
- [Yarn](https://yarnpkg.com/) JavaScript package manager

## Additional information

See project [UITEST](https://issues.folio.org/browse/UITEST)
at the [FOLIO issue tracker](https://dev.folio.org/guidelines/issue-tracker).

Other FOLIO Developer documentation is at [dev.folio.org](https://dev.folio.org/)
