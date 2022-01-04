
/// <reference types="cypress" />

import { testType } from '../../support/utils/tagTools';

describe('ui-data-import: MARC file upload with the update of instance, holding, and items', () => {
  before('navigates to Settings', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C343335 Create a new mapping and action profiles', { tags: [testType.smoke] }, () => {

  });
});
