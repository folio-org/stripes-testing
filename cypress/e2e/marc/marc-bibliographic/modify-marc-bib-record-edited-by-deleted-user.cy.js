import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const testData = {
      source: 'MARC',
      tag245: '245',
      updatedTag245Value: 'C358964 Title (Updated by User A)',
      updatedTag245Value2: 'C358964 Title (Updated by User B)',
    };

    const users = {};

    const marcFile = {
      marc: 'marcBibFileForC358964.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    let createdRecordID;

    before('Creating user, data', () => {
      cy.getAdminToken();
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
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordID = record[marcFile.propertyName].id;
              });
            });

            cy.login(users.userAProperties.username, users.userAProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(users.userBProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordID);
    });

    it(
      'C358964 Verify that user has access to "quickMARC" when user who edited MARC record has been deleted (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C358964'] },
      () => {
        InventoryInstances.searchBySource(testData.source);
        InventoryInstances.searchByTitle(createdRecordID);
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
          authRefresh: true,
        });

        UsersSearchPane.searchByUsername(users.userAProperties.username);
        UsersSearchPane.openUser(users.userAProperties.username);
        Users.deleteUser();
        Users.successMessageAfterDeletion(
          `User ${users.userAProperties.lastName}, ${users.userAProperties.preferredFirstName} testMiddleName deleted successfully.`,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(testData.updatedTag245Value);
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
});
