/* eslint-disable no-only-tests/no-only-tests */
/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import Actions from '../../support/fragments/inventory/actions';
import NewInventoryInstance from '../../support/fragments/inventory/newInventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';

describe('Manage records ', () => {
  before(() => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });
  it('C10950 Edit and save a MARC record in quickMARC', () => {
    Actions.import();
    NewInventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.addNewLine();
  });

  // afterEach(() => {
  // });
});
