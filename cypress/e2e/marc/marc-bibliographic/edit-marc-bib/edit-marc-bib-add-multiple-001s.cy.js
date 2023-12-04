import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    tag001: '001',
    tag001Content: '$a n 94000339',
    tag001ValueInSourceMask: /[a-z]+\d+/,
  };

  const marcFiles = [
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdAuthorityIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
  });

  it(
    'C387458 Add multiple 001s when editing "MARC Bibliographic" record (spitfire)(TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.MARC);
      InventoryInstances.verifyInstanceResultListIsAbsent(false);
      InventoryInstances.selectInstance();

      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();

      QuickMarcEditor.addEmptyFields(4);
      QuickMarcEditor.checkEmptyFieldAdded(5);

      QuickMarcEditor.updateExistingField('', testData.tag001Content);
      QuickMarcEditor.updateTagNameToLockedTag(5, testData.tag001);
      QuickMarcEditor.checkFourthBoxDisabled(5);

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.waitLoading();

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.tag001);
      QuickMarcEditor.checkFieldContentMatch(
        'textarea[name="records[1].content"]',
        testData.tag001ValueInSourceMask,
      );
    },
  );
});
