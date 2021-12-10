/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';

describe('Manage holding records through quickmarc editor', () => {
  before(() => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
    InventoryActions.import();
  });
  beforeEach(() => {
    InventoryInstance.addMarcHoldingRecord();
  });
  it('C345390 Add a field to a record using quickMARC', () => {


    //
    // InventoryInstance.goToEditMARCBiblRecord();

    // const expectedInSourceRow = QuickMarcEditor.addNewField();
    // // TODO: add return value to validate the result by value too. As minimum add catching from response. The best way - through interactors
    // QuickMarcEditor.deletePenaltField();
    // const expectedInSourceRowWithSubfield = QuickMarcEditor.addNewFieldWithSubField();
    // QuickMarcEditor.pressSaveAndClose();
    // QuickMarcEditor.deleteConfirmationPresented();
    // QuickMarcEditor.confirmDelete();

    // InventoryInstance.viewSource();

    // InventoryViewSource.contains(expectedInSourceRow);
    // InventoryViewSource.contains(expectedInSourceRowWithSubfield);
    // TODO: add assertion of absence of deleted row
    // InventoryViewSource.notContains('948\t   \t‡h NO HOLDINGS IN PAOLF - 43 OTHER HOLDINGS ');
  });
});
