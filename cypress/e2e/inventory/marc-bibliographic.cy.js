import TopMenu from '../../support/fragments/topMenu';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import InstanceRecordEdit from '../../support/fragments/inventory/instanceRecordEdit';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';

import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('MARC -> MARC Bibliographic', () => {
  const testData = {};

  const marcFile = {
    marc: 'marcFileOCLC.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  before(() => {
    cy.createTempUser([
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.converterStorageAll.gui,
      Permissions.uiInventoryViewCreateEditInstances.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.instanceID = link.split('/')[5];
        });
      });
    });
  });

  beforeEach(() => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(testData.instanceID);
  });

  it(
    'C10950 Edit and save a MARC record in quickMARC (spitfire)',
    { tags: ['smoke', 'spitfire', 'nonParallel'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instanceID);

      InventoryInstance.goToEditMARCBiblRecord();
      QuickMarcEditor.waitLoading();
      cy.reload();
      const expectedInSourceRow = QuickMarcEditor.addNewField(QuickMarcEditor.getFreeTags()[0]);
      QuickMarcEditor.deletePenaltField().then((deletedTag) => {
        const expectedInSourceRowWithSubfield = QuickMarcEditor.addNewFieldWithSubField(
          QuickMarcEditor.getFreeTags()[1],
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.deleteConfirmationPresented();
        QuickMarcEditor.confirmDelete();
        // Wait for the content to be loaded.
        cy.wait(4000);
        InventoryInstance.viewSource();
        InventoryViewSource.contains(expectedInSourceRow);
        InventoryViewSource.contains(expectedInSourceRowWithSubfield);
        InventoryViewSource.notContains(deletedTag);
      });
    },
  );

  it(
    'C10924 Add a field to a record using quickMARC (spitfire)',
    { tags: ['smoke', 'spitfire', 'nonParallel', 'system'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instanceID);

      InventoryInstance.goToEditMARCBiblRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.addRow();
      QuickMarcEditor.checkInitialContent();
      const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues();

      QuickMarcEditor.pressSaveAndClose();
      InventoryInstance.waitLoading();
      // Wait for the content to be loaded.
      cy.wait(4000);
      InventoryInstance.viewSource();
      InventoryViewSource.contains(expectedInSourceRow);
      InventoryViewSource.close();
      InventoryInstance.waitLoading();

      InventoryInstance.goToEditMARCBiblRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.checkContent();
    },
  );

  it(
    'C10928 Delete a field(s) from a record in quickMARC (spitfire)',
    { tags: ['smoke', 'spitfire', 'nonParallel'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instanceID);

      InventoryInstance.goToEditMARCBiblRecord();
      QuickMarcEditor.waitLoading();
      cy.reload();
      QuickMarcEditor.deletePenaltField().then((deletedTag) => {
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.deleteConfirmationPresented();
        QuickMarcEditor.confirmDelete();
        InventoryInstance.waitLoading();
        // Wait for the content to be loaded.
        cy.wait(4000);
        InventoryInstance.viewSource();
        InventoryViewSource.notContains(deletedTag);
      });
    },
  );

  it(
    'C10957 Attempt to delete a required field (spitfire)',
    { tags: ['smoke', 'spitfire', 'nonParallel'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instanceID);

      InventoryInstance.goToEditMARCBiblRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.checkRequiredFields();
    },
  );

  it(
    'C10951 Add a 5XX field to a marc record in quickMARC (spitfire)',
    { tags: ['smoke', 'spitfire', 'nonParallel', 'system'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instanceID);
      InventoryInstance.checkExpectedMARCSource();

      InventoryInstance.editInstance();
      InstanceRecordEdit.checkReadOnlyFields();
      InstanceRecordEdit.close();

      InventoryInstance.goToEditMARCBiblRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.addRow();
      QuickMarcEditor.checkInitialContent();

      const testRecord = {
        content: 'testContent',
        tag: '505',
        tagMeaning: 'Formatted Contents Note',
      };
      const expectedInSourceRow = QuickMarcEditor.fillAllAvailableValues(
        testRecord.content,
        testRecord.tag,
      );
      QuickMarcEditor.pressSaveAndClose();
      // Wait for the content to be loaded.
      cy.wait(4000);
      InventoryInstance.viewSource();
      InventoryViewSource.contains(expectedInSourceRow);
      InventoryViewSource.close();

      InventoryInstance.checkInstanceNotes(testRecord.tagMeaning, testRecord.content);
    },
  );

  it(
    'C345388 Derive a MARC bib record (spitfire)',
    { tags: ['smoke', 'spitfire', 'nonParallel'] },
    () => {
      // InventorySearchAndFilter.searchInstanceByTitle(testData.instanceID);
      cy.visit(`${TopMenu.inventoryPath}/view/${testData.instanceID}`);
      InventoryInstance.checkDetailsViewOpened();

      InventoryInstance.getAssignedHRID().then((instanceHRID) => {
        InventoryInstance.deriveNewMarcBib();
        const expectedCreatedValue = QuickMarcEditor.addNewField();

        QuickMarcEditor.deletePenaltField().then((deletedTag) => {
          const expectedUpdatedValue = QuickMarcEditor.updateExistingField('245');

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.deleteConfirmationPresented();
          QuickMarcEditor.confirmDelete();
          cy.wait(5000);
          InventoryInstance.checkUpdatedHRID(instanceHRID);
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.checkPresentedText(expectedUpdatedValue);

          // Wait for the content to be loaded.
          cy.wait(4000);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(expectedCreatedValue);
          InventoryViewSource.contains(expectedUpdatedValue);
          InventoryViewSource.notContains(deletedTag);
        });
      });
    },
  );
});
