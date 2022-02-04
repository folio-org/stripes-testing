/// <reference types="cypress" />

import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import permissions from '../../support/dictionary/permissions';

// TODO: redesign test to exclude repeated steps
describe('Manage inventory Bib records with quickMarc editor', () => {
  let userId = '';

  beforeEach(() => {
    // TODO: discuss with Khalilah required set of quickmarc permissions
    cy.createTempUser([permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.inventoryPath);
      InventoryActions.import();
    });
  });
  it('C10950 Edit and save a MARC record in quickMARC', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.goToEditMARCBiblRecord();

    const expectedInSourceRow = QuickMarcEditor.addNewField(QuickMarcEditor.getFreeTags()[0]);
    QuickMarcEditor.deletePenaltField().then(deletedTag => {
      const expectedInSourceRowWithSubfield = QuickMarcEditor.addNewFieldWithSubField(QuickMarcEditor.getFreeTags()[1]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.deleteConfirmationPresented();
      QuickMarcEditor.confirmDelete();
      InventoryInstance.viewSource();
      InventoryViewSource.contains(expectedInSourceRow);
      InventoryViewSource.contains(expectedInSourceRowWithSubfield);
      InventoryViewSource.notContains(deletedTag);
    });
  });

  it('C10924 Add a field to a record using quickMARC', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.addRow();
    QuickMarcEditor.checkInitialContent();
    const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues();

    QuickMarcEditor.pressSaveAndClose();
    InventoryInstance.waitLoading();
    InventoryInstance.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);
    InventoryViewSource.close();
    InventoryInstance.waitLoading();

    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.checkContent();
  });

  it('C10928 Delete a field(s) from a record in quickMARC', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.deletePenaltField().then(deletedTag => {
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.deleteConfirmationPresented();
      QuickMarcEditor.confirmDelete();
      InventoryInstance.viewSource();
      InventoryViewSource.notContains(deletedTag);
    });
  });

  it('C10957 Attempt to delete a required field', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.checkRequiredFields();
  });

  it.only('C10951 Add a 5XX field to a marc record in quickMARC', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.overlaySourceBibRecord();

    // TODO: add id to div with update datetime and verification of this value
    InventoryInstance.checkExpectedOCLCPresence();
    InventoryInstance.checkExpectedMARCSource();

    InventoryInstance.editInstance();
    // TODO: add assert to readonly fields
    InventoryInstanceEdit.checkReadOnlyFields();
    // InventoryInstanceEdit.close();

    // InventoryInstance.goToEditMARCBiblRecord();
    // QuickMarcEditor.addRow();
    // QuickMarcEditor.checkInitialContent();

    // const testRecord = { content: 'testContent', tag: '505', tagMeaning: 'Formatted Contents Note' };
    // const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues(testRecord.content, testRecord.tag);
    // QuickMarcEditor.pressSaveAndClose();

    // InventoryInstance.viewSource();
    // InventoryViewSource.contains(expectedInSourceRow);
    // InventoryViewSource.close();

    // InventoryInstance.checkInstanceNotes(testRecord.tagMeaning, testRecord.content);
  });

  it('C345388 Derive a MARC bib record', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    // TODO: check the issue with reading in new version of interactors
    InventoryInstance.getAssignedHRID()
      .then(instanceHRID => {
        InventoryInstance.deriveNewMarcBib();
        const expectedCreatedValue = QuickMarcEditor.addNewField();

        QuickMarcEditor.deletePenaltField().then(deletedTag => {
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
          InventoryViewSource.notContains(deletedTag);
        });
      });
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
