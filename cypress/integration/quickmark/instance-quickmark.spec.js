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
import Users from '../../support/fragments/users/users';

// TODO: redesign test to exclude repeated steps
describe('Manage inventory Bib records with quickMarc editor', () => {
  let userId = '';
  const quickmarcEditor = new QuickMarcEditor(InventoryInstance.validOCLC);

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
    QuickMarcEditor.waitLoading();

    const expectedInSourceRow = quickmarcEditor.addNewField(QuickMarcEditor.getFreeTags()[0]);
    quickmarcEditor.deletePenaltField().then(deletedTag => {
      const expectedInSourceRowWithSubfield = quickmarcEditor.addNewFieldWithSubField(QuickMarcEditor.getFreeTags()[1]);
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
    QuickMarcEditor.waitLoading();
    quickmarcEditor.addRow();
    quickmarcEditor.checkInitialContent();
    const expectedInSourceRow = quickmarcEditor.fillAllAvailableValues();

    QuickMarcEditor.pressSaveAndClose();
    InventoryInstance.waitLoading();
    InventoryInstance.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);
    InventoryViewSource.close();
    InventoryInstance.waitLoading();

    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.waitLoading();
    quickmarcEditor.checkContent();
  });

  it('C10928 Delete a field(s) from a record in quickMARC', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.waitLoading();
    quickmarcEditor.deletePenaltField().then(deletedTag => {
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.deleteConfirmationPresented();
      QuickMarcEditor.confirmDelete();
      InventoryInstance.waitLoading();
      InventoryInstance.viewSource();
      InventoryViewSource.notContains(deletedTag);
    });
  });

  it('C10957 Attempt to delete a required field', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.checkRequiredFields();
  });

  it('C10951 Add a 5XX field to a marc record in quickMARC', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    InventoryInstance.startOverlaySourceBibRecord();
    InventoryActions.fillImportFields(InventoryInstance.validOCLC.id);
    InventoryActions.pressImportInModal();

    // TODO: add id to div with update datetime and verification of this value
    InventoryInstance.checkExpectedOCLCPresence();
    InventoryInstance.checkExpectedMARCSource();

    InventoryInstance.editInstance();
    InventoryInstanceEdit.checkReadOnlyFields();
    InventoryInstanceEdit.close();

    InventoryInstance.goToEditMARCBiblRecord();
    QuickMarcEditor.waitLoading();
    quickmarcEditor.addRow();
    quickmarcEditor.checkInitialContent();

    const testRecord = { content: 'testContent', tag: '505', tagMeaning: 'Formatted Contents Note' };
    const expectedInSourceRow = quickmarcEditor.fillAllAvailableValues(testRecord.content, testRecord.tag);
    QuickMarcEditor.pressSaveAndClose();

    InventoryInstance.viewSource();
    InventoryViewSource.contains(expectedInSourceRow);
    InventoryViewSource.close();

    InventoryInstance.checkInstanceNotes(testRecord.tagMeaning, testRecord.content);
  });

  it('C345388 Derive a MARC bib record', { tags: [testTypes.smoke, features.quickMarcEditor] }, () => {
    // TODO: check the issue with reading in new version of interactors
    InventoryInstance.getAssignedHRID()
      .then(instanceHRID => {
        InventoryInstance.deriveNewMarcBib();
        const expectedCreatedValue = quickmarcEditor.addNewField();

        quickmarcEditor.deletePenaltField().then(deletedTag => {
          const expectedUpdatedValue = quickmarcEditor.updateExistingField();

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
    Users.deleteViaApi(userId);
  });
});
