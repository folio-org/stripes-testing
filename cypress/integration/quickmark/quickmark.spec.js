/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';

describe('Manage records ', () => {
  before(() => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });
  it('C10950 Edit and save a MARC record in quickMARC', () => {
    InventoryActions.import();
    InventoryInstance.goToEditMARCBiblRecord();

    const expectedInSourceRow = QuickMarcEditor.addNewField();
    // TODO: add return value to validate the result by value too. As minimum add catching from response. The best way - through interactors
    QuickMarcEditor.deletePenaltField();
    const expectedInSourceRowWithSubfield = QuickMarcEditor.addNewFieldWithSubField();
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.deleteConfirmationPresented();
    QuickMarcEditor.confirmDelete();

    InventoryInstance.viewSource();

    // TODO: see not clear behavior with adding of subfield $a
    // InventoryViewSource.contains(expectedInSourceRow1);
    InventoryViewSource.contains(expectedInSourceRowWithSubfield);
    // TODO: add assertion of absence of deleted row
    // InventoryViewSource.notContains('948\t   \t‡h NO HOLDINGS IN PAOLF - 43 OTHER HOLDINGS ');
  });

  it('C10924 Add a field to a record using quickMARC', () => {
    InventoryActions.import();
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.addRow();
    QuickMarcEditor.checkInitialContent();
    const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues();

    QuickMarcEditor.pressSaveAndClose();
    InventoryInstance.waitLoading();
    InventoryInstance.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);
    InventoryViewSource.close();

    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.checkContent();
  });

  it('C10928 Delete a field(s) from a record in quickMARC', () => {
    InventoryActions.import();
    InventoryInstance.goToEditMARCBiblRecord();
    // TODO: add return value to validate the result by value too. As minimum add catching from response. The best way - through interactors
    QuickMarcEditor.deletePenaltField();
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.deleteConfirmationPresented();
    QuickMarcEditor.confirmDelete();
    InventoryInstance.viewSource();
    // TODO: add assertion of absence of deleted row
    // InventoryViewSource.notContains('948\t   \t‡h NO HOLDINGS IN PAOLF - 43 OTHER HOLDINGS ');
  });

  it('C10957 Attempt to delete a required field', () => {
    InventoryActions.import();
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.checkRequiredFields();
  });

  it.only('C10951 Add a 5XX field to a marc record in quickMARC', () => {
    InventoryActions.import();
    InventoryInstance.overlaySourceBibRecord();

    // TODO: add id to div with update datetime and verification of this value
    InventoryInstance.checkExpectedOCLCPresence();
    InventoryInstance.checkExpectedMARCSource();

    InventoryInstance.editInstance();
    // TODO: add assert to readonly fields

    InventoryInstanceEdit.close();
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.addRow();
    QuickMarcEditor.checkInitialContent();

    const testRecord = { content: 'testContent', tag: '505', tagMeaning: 'Formatted Contents Note' };
    const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues(testRecord.content, testRecord.tag);
    QuickMarcEditor.pressSaveAndClose();

    InventoryInstance.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);

    InventoryViewSource.close();

  });
});
