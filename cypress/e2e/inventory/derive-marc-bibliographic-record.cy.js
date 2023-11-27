import { Permissions } from '../../support/dictionary';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('MARC -› MARC Bibliographic -› Derive MARC bib', () => {
  const testData = {
    marcBibTitle: 'Pretty_Woman',
    marcBibFilePath: 'Pretty_Woman_movie.mrc',
    marcBibFileName: `testMarcFileC380646.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  let createdRecordIDs;

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.dataImportUploadAll.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(testData.marcBibFilePath, testData.marcBibFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(testData.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcBibFileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(testData.marcBibFileName);
        Logs.getCreatedItemsID().then((link) => {
          createdRecordIDs = link.split('/')[5];
        });
      });
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs);
  });

  it(
    'C380646 Derive "MARC Bibliographic" record with multiple "010" fields (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      cy.visit(TopMenu.inventoryPath);
      InventoryInstance.searchByTitle(testData.marcBibTitle);
      InventoryInstance.selectTopRecord();
      InventoryInstance.deriveNewMarcBib();
      QuickMarcEditor.addNewField('010', '$a   766384', 6);
      QuickMarcEditor.addNewField('010', '$a   5689434', 7);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyMultipleTagCallout('010');
      QuickMarcEditor.deleteTag(8);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyDerivedMarcBibSave();
    },
  );
});
