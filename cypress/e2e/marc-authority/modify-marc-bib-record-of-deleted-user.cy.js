import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('MARC -> MARC Authority', () => {
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
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
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
    Users.deleteViaApi(user.userBProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
  });

  it(
    'C358963 Verify that user has access to "quickMARC" when user who imported "MARC Bib" record has been deleted (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      UsersSearchPane.searchByUsername(user.userAProperties.username);
      UsersSearchPane.openUser(user.userAProperties.username);
      Users.deleteUser();
      Users.successMessageAfterDeletion(
        `User ${user.userAProperties.username}, testPermFirst testMiddleName deleted successfully.`,
      );

      cy.visit(TopMenu.inventoryPath);
      InventoryInstance.searchByTitle(testData.instanceValue);
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
