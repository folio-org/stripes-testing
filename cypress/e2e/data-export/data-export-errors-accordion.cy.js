import TopMenu from '../../support/fragments/topMenu';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportViewAllLogs from '../../support/fragments/data-export/dataExportViewAllLogs';
import devTeams from '../../support/dictionary/devTeams';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: generateItemBarcode(),
};
const validFile = `autoTestValidFile${getRandomPostfix()}.csv`;
const invalidFile = `autoTestInvalidFile${getRandomPostfix()}.csv`;
const partiallyValidFile = `autoTestInvalidFile${getRandomPostfix()}.csv`;

describe.skip('Data-export', () => {
  // skipped because of a bug (MDEXP-600)
  before('Create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportAll.gui,
      permissions.dataExportEnableModule.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
      cy.visit(TopMenu.dataExportPath);
      const instanceID = InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
      );
      FileManager.createFile(`cypress/fixtures/${validFile}`, instanceID);
      FileManager.createFile(`cypress/fixtures/${invalidFile}`, 'not a valid id');
      FileManager.createFile(
        `cypress/fixtures/${partiallyValidFile}`,
        `${instanceID}\n 'not a valid id'`,
      );
    });
    ExportFileHelper.uploadFile(validFile);
    ExportFileHelper.exportWithDefaultJobProfile(validFile);
    ExportFileHelper.uploadFile(invalidFile);
    ExportFileHelper.exportWithDefaultJobProfile(invalidFile);
    ExportFileHelper.uploadFile(partiallyValidFile);
    ExportFileHelper.exportWithDefaultJobProfile(partiallyValidFile);
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${validFile}`);
    FileManager.deleteFile(`cypress/fixtures/${invalidFile}`);
    FileManager.deleteFile(`cypress/fixtures/${partiallyValidFile}`);
  });

  it(
    'C404374 Verify "Errors" accordion in the Search & filter pane on the "View all" screen (firebird) (TaaS)',
    { tags: [devTeams.firebird] },
    () => {
      DataExportViewAllLogs.openAllJobLogs();

      DataExportViewAllLogs.verifySearchAndFilterPane();
      DataExportViewAllLogs.verifyIDOption();
      DataExportViewAllLogs.verifyRecordSearch();
      DataExportViewAllLogs.verifySearchButton();
      DataExportViewAllLogs.verifySearchButtonIsDisabled();
      DataExportViewAllLogs.verifyResetAllButton();
      DataExportViewAllLogs.verifyResetAllIsDisabled();
      DataExportViewAllLogs.verifyErrorsInExportAccordion();
      DataExportViewAllLogs.verifyStartedRunningAccordion();
      DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
      DataExportViewAllLogs.verifyEndedRunningAccordion();
      DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
      DataExportViewAllLogs.verifyJobProfileAccordion();
      DataExportViewAllLogs.verifyJobProfileIsCollapsed();
      DataExportViewAllLogs.verifyLogsMainPane();
      DataExportViewAllLogs.verifyLogsIcon();
      DataExportViewAllLogs.verifyRecordsFoundText();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
      DataExportViewAllLogs.verifyErrorsInExportOptions();

      DataExportViewAllLogs.checkErrorsInExportOption('Yes');
      DataExportViewAllLogs.verifyStatusIncludesErrors();
      DataExportViewAllLogs.clickTheCrossIcon();
      DataExportViewAllLogs.verifyErrorsInExportCheckbox('Yes', false);
      DataExportViewAllLogs.verifyStatusIncludesAll();
      DataExportViewAllLogs.checkErrorsInExportOption('No');
      DataExportViewAllLogs.verifyStatusAllCompleted();
      DataExportViewAllLogs.checkErrorsInExportOption('Yes');
      DataExportViewAllLogs.verifyStatusIncludesAll();
      DataExportViewAllLogs.resetAll();
      DataExportViewAllLogs.verifyErrorsInExportCheckbox('Yes', false);
      DataExportViewAllLogs.verifyErrorsInExportCheckbox('No', false);
      DataExportViewAllLogs.verifyStatusIncludesAll();
    },
  );
});
