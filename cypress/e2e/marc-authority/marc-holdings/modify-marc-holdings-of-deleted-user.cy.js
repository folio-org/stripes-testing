import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC -> MARC Authority', () => {
  const testData = {
    calloutMessage:
      'This record has successfully saved and is in process. Changes may not appear immediately.',
  };

  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

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
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(fileName);
        Logs.getCreatedItemsID(0).then((link) => {
          instanceID = link.split('/')[5];
        });
        Logs.goToTitleLink('Created');
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
    cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventorySearchAndFilter.waitLoading });
    InventorySearchAndFilter.searchInstanceByTitle(instanceID);
    InventorySearchAndFilter.selectViewHoldings();
    HoldingsRecordView.delete();
    if (instanceID) InventoryInstance.deleteInstanceViaApi(instanceID);
    Users.deleteViaApi(user.userBProperties.userId);
  });

  it(
    'C358996 Verify that user has access to "quickMARC" when user who imported "MARC holdings" record has been deleted (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
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
