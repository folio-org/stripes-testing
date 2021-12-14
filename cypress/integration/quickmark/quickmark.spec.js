/* eslint-disable no-only-tests/no-only-tests */
/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/InventoryActions';
import NewInventoryInstance from '../../support/fragments/inventory/newInventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';

describe('Manage records ', () => {
  before(() => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });
  it('C10950 Edit and save a MARC record in quickMARC', () => {
    InventoryActions.import();
    NewInventoryInstance.goToEditMARCBiblRecord();

    const expectedInSourceRow = QuickMarcEditor.addNewField();
    // TODO: add return value to validate the result by value too. As minimum add catching from response. The best way - through interactors
    QuickMarcEditor.deletePenaltField();
    const expectedInSourceRowWithSubfield = QuickMarcEditor.addNewFieldWithSubField();
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.deleteConfirmationPresented();
    QuickMarcEditor.confirmDelete();

    NewInventoryInstance.viewSource();

    // TODO: see not clear behavior with adding of subfield $a
    // InventoryViewSource.contains(expectedInSourceRow1);
    InventoryViewSource.contains(expectedInSourceRowWithSubfield);
    // TODO: add assertion of absence of deleted row
    // InventoryViewSource.notContains('948\t   \t‡h NO HOLDINGS IN PAOLF - 43 OTHER HOLDINGS ');
  });
});
