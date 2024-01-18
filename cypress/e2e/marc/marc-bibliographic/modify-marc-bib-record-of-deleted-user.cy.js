import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic', () => {
  const testData = {
    instanceValue: 'C358963 The Journal of ecclesiastical history.',
    valueForUpdate: '$a C358963 The Journal of ecclesiastical future.',
    valueAfterUpdate: 'C358963 The Journal of ecclesiastical future.',
    calloutMessage:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
  };

  const user = {};

  const marcFiles = [
    {
      marc: 'marcBibFileForC358963.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
    ]).then((createdUserProperties) => {
      user.userAProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.login(user.userAProperties.username, user.userAProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        }).then(() => {
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });
      });
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiUsersCheckTransactions.gui,
      Permissions.uiUsersDelete.gui,
      Permissions.uiUserEdit.gui,
      Permissions.uiUsersView.gui,
    ]).then((createdUserProperties) => {
      user.userBProperties = createdUserProperties;
      cy.login(user.userBProperties.username, user.userBProperties.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userBProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
  });

  it(
    'C358963 Verify that user has access to "quickMARC" when user who imported "MARC Bib" record has been deleted (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      UsersSearchPane.searchByUsername(user.userAProperties.username);
      UsersSearchPane.openUser(user.userAProperties.username);
      Users.deleteUser();
      Users.successMessageAfterDeletion(
        `User ${user.userAProperties.username}, testPermFirst testMiddleName deleted successfully.`,
      );

      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.searchByTitle(testData.instanceValue);
      InventoryInstances.selectInstance();

      InventoryInstance.deriveNewMarcBibRecord();
      InventoryInstance.closeInstancePage();
      InventoryInstance.checkPresentedText(testData.instanceValue);

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.updateExistingFieldContent(14, testData.valueForUpdate);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.calloutMessage);
      InventoryInstance.checkPresentedText(testData.valueAfterUpdate);
    },
  );
});
