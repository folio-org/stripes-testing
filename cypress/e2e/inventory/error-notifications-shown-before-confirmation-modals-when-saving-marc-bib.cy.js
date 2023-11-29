import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';

describe('MARC › MARC Bibliographic › Edit MARC bib', () => {
  const testData = {
    createdRecordIDs: [],
  };
  const marcFile = {
    marc: 'marcBibFileForC375176.mrc',
    fileName: `C375176 testMarcFile${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numOfRecords: 1,
  };

  cy.createTempUser([
    Permissions.inventoryAll.gui,
    Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
  ]).then((userProperties) => {
    testData.user = userProperties;

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
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
          testData.createdRecordIDs.push(link.split('/')[5]);
        });
      }
    });

    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting test user and an inventory instance', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
      MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
    });
  });

  it(
    'C375176 Error notifications shown before confirmation modals when saving "MARC bib" record while editing record (Spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstances.waitContentLoading();
      InventoryInstance.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.updateExistingTagName('040', '0');
      QuickMarcEditor.updateExistingField('LDR', '01338cas\\a2200409\\\\450');
      QuickMarcEditor.deleteTag('76');
      QuickMarcEditor.updateExistingField('300', 'TEST');
      QuickMarcEditor.pressSaveAndKeepEditing(
        'Record cannot be saved. The Leader must contain 24 characters, including null spaces.',
      );
      QuickMarcEditor.updateExistingField('LDR', '01338cas\\a2200409\\\\4500');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyAndDismissWrongTagLengthCallout();
      QuickMarcEditor.updateExistingTagName('0', '040');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyConfirmModal();
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.checkButtonsEnabled();
    },
  );
});
