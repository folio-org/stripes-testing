/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';
import { testType, feature } from '../../support/utils/tagTools';

describe('Manage inventory Bib records with quickMarc editor', () => {
  beforeEach(() => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });
  it('C10950 Edit and save a MARC record in quickMARC', { tags: [testType.smoke, feature.quickMarcEditor] }, () => {
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

    InventoryViewSource.contains(expectedInSourceRow);
    InventoryViewSource.contains(expectedInSourceRowWithSubfield);
    // TODO: add assertion of absence of deleted row
    // InventoryViewSource.notContains('948\t   \t‡h NO HOLDINGS IN PAOLF - 43 OTHER HOLDINGS ');
  });

  it('C10924 Add a field to a record using quickMARC', { tags: [testType.smoke, feature.quickMarcEditor] }, () => {
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

  it('C10928 Delete a field(s) from a record in quickMARC', { tags: [testType.smoke, feature.quickMarcEditor] }, () => {
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

  it('C10957 Attempt to delete a required field', { tags: [testType.smoke, feature.quickMarcEditor] }, () => {
    InventoryActions.import();
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.checkRequiredFields();
  });

  it('C10951 Add a 5XX field to a marc record in quickMARC', { tags: [testType.smoke, feature.quickMarcEditor] }, () => {
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

    InventoryInstance.checkInstanceNotes(testRecord.tagMeaning, testRecord.content);
  });

  it('C345388 Derive a MARC bib record', { tags: [testType.smoke, feature.quickMarcEditor] }, () => {
    InventoryActions.import();
    // TODO: check the issue with reading in new version of interactors
    InventoryInstance.getAssignedHRID()
      .then(instanceHRID => {
        InventoryInstance.deriveNewMarcBib();
        const expectedCreatedValue = QuickMarcEditor.addNewField();

        // TODO: add return value to validate the result by value too. As minimum add catching from response. The best way - through interactors
        QuickMarcEditor.deletePenaltField();

        const expectedUpdatedValue = QuickMarcEditor.updateExistingField();

        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.deleteConfirmationPresented();
        QuickMarcEditor.confirmDelete();

        InventoryInstance.checkUpdatedHRID(instanceHRID);
        InventoryInstance.checkExpectedMARCSource();
        // TODO: find correct tag to new field in record which presented into Inventory Instance
        InventoryInstance.checkPresentedText(expectedUpdatedValue);

        InventoryInstance.viewSource();
        InventoryViewSource.contains(expectedCreatedValue);
        InventoryViewSource.contains(expectedUpdatedValue);
        // TODO: add check of absence of deleted field
      });
  });
});
