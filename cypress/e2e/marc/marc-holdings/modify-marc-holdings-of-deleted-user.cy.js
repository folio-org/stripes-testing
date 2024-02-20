import Permissions from '../../../support/dictionary/permissions';
import { RECORD_STATUSES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      calloutMessage:
        'This record has successfully saved and is in process. Changes may not appear immediately.',
    };

    const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const propertyName = 'relatedInstanceInfo';

    let instanceID;

    const user = {};

    before('Creating user', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      ]).then((createdUserProperties) => {
        user.userAProperties = createdUserProperties;

        cy.login(user.userAProperties.username, user.userAProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        }).then(() => {
          DataImport.uploadFileViaApi(
            'oneMarcBib.mrc',
            fileName,
            jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              instanceID = record[propertyName].idList[0];
            });
          });
          JobProfiles.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, 'Completed');
          Logs.openFileDetails(fileName);
          Logs.goToTitleLink(RECORD_STATUSES.CREATED);
          InventorySteps.addMarcHoldingRecord();
        });
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
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
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
      InventorySearchAndFilter.searchInstanceByTitle(instanceID);
      InventorySearchAndFilter.selectViewHoldings();
      HoldingsRecordView.delete();
      if (instanceID) InventoryInstance.deleteInstanceViaApi(instanceID);
      Users.deleteViaApi(user.userBProperties.userId);
    });

    it(
      'C358996 Verify that user has access to "quickMARC" when user who imported "MARC holdings" record has been deleted (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        UsersSearchPane.searchByUsername(user.userAProperties.username);
        UsersSearchPane.openUser(user.userAProperties.username);
        Users.deleteUser();
        Users.successMessageAfterDeletion(
          `User ${user.userAProperties.username}, testPermFirst testMiddleName deleted successfully.`,
        );

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByTitle(instanceID);
        InventorySearchAndFilter.selectViewHoldings();
        // TODO: Delete below two lines of code after Actions -> View source of Holding's view works as expected.
        HoldingsRecordView.close();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.editInQuickMarc();

        QuickMarcEditor.addRow(HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor);
        QuickMarcEditor.checkInitialContent(
          HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor + 1,
        );
        QuickMarcEditor.fillAllAvailableValues(
          undefined,
          undefined,
          HoldingsRecordView.newHolding.rowsCountInQuickMarcEditor,
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkCallout(testData.calloutMessage);
      },
    );
  });
});
