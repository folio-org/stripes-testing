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
import { JOB_STATUS_NAMES } from '../../support/constants';

describe('MARC -> MARC Authority', () => {
  const testData = {
    source: 'MARC',
    tag245: '245',
    updatedTag245Value: 'C358964 Title (Updated by User A)',
    updatedTag245Value2: 'C358964 Title (Updated by User B)',
  };

  const users = {};

  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  let createdRecordID;

  before('Creating user, data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      users.userAProperties = createdUserProperties;

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiUsersCheckTransactions.gui,
        Permissions.uiUsersDelete.gui,
        Permissions.uiUserEdit.gui,
        Permissions.uiUsersView.gui,
      ]).then((createdUserPropertiesB) => {
        users.userBProperties = createdUserPropertiesB;

        cy.loginAsAdmin({
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        }).then(() => {
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdRecordID = link.split('/')[5];
          });

          cy.login(users.userAProperties.username, users.userAProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });
  });

  after('Deleting created user, data', () => {
    Users.deleteViaApi(users.userBProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordID);
  });

  it(
    'C358964 Verify that user has access to "quickMARC" when user who edited MARC record has been deleted (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstances.searchBySource(testData.source);
      InventoryInstance.searchByTitle(createdRecordID);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.updatedTag245Value}`);
      // wait for updates to apply
      cy.wait(1000);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      cy.login(users.userBProperties.username, users.userBProperties.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });

      UsersSearchPane.searchByUsername(users.userAProperties.username);
      UsersSearchPane.openUser(users.userAProperties.username);
      Users.deleteUser();
      Users.successMessageAfterDeletion(
        `User ${users.userAProperties.lastName}, ${users.userAProperties.firstName} testMiddleName deleted successfully.`,
      );

      cy.visit(TopMenu.inventoryPath);
      InventoryInstance.searchByTitle(testData.updatedTag245Value);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.closeWithoutSaving();
      InventoryInstances.verifyInstanceDetailsView();
      // wait for record to be loaded
      cy.wait(1000);
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.updatedTag245Value2}`);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
    },
  );
});
