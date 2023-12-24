import getRandomPostfix from '../../../../support/utils/stringTools';
import { RECORD_STATUSES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    createdRecordIDs: [],
  };

  const marcFile = {
    marc: 'marcBibFileForC387455.mrc',
    fileName: `testMarcFileC387455.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numOfRecords: 2,
  };

  const firstInstanceTitle = 'Extra 008 positions Vanity fair.';
  const secondInstanceTitle = 'Too few 008 positions Vanity fair.';

  before('Create user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.moduleDataImportEnabled.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C387455 User can edit imported "MARC Bib" file without required number (40) of "008" positions (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      Logs.openFileDetails(marcFile.fileName);
      for (let i = 0; i < marcFile.numOfRecords; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          testData.createdRecordIDs.push(link.split('/')[5]);
        });
      }
      Logs.verifyInstanceStatus(0, 2);
      Logs.verifyInstanceStatus(1, 2);

      Logs.clickOnHotLink(0, 3, RECORD_STATUSES.CREATED);
      InventoryInstance.verifyInstanceTitle(firstInstanceTitle);
      InventoryInstance.editMarcBibliographicRecord();

      QuickMarcEditor.updateValueOf008BoxByBoxName('MRec', 'S');
      QuickMarcEditor.updateExistingFieldContent(7);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      TopMenuNavigation.navigateToApp('Data import');
      Logs.verifyInstanceStatus(0, 2);
      Logs.verifyInstanceStatus(1, 2);

      Logs.clickOnHotLink(1, 3, RECORD_STATUSES.CREATED);
      InventoryInstance.verifyInstanceTitle(secondInstanceTitle);
      InventoryInstance.editMarcBibliographicRecord();

      QuickMarcEditor.updateValueOf008BoxByBoxName('Freq', 'F');
      QuickMarcEditor.updateExistingFieldContent(7);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
    },
  );
});
