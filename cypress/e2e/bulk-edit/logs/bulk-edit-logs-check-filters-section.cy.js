import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import DateTools from '../../../support/utils/dateTools';

let user;
const usersForJobs = [];
const instance = {
  instanceName: `AT_C368017_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `item_${getRandomPostfix()}`,
};
const instanceUUIDs = [];
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const instanceUUIDsFileName = `instanceUUIDs_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('create test data', () => {
      cy.getAdminToken();

      // Create user for logs view
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });

      // Create users who will execute bulk edit jobs
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        usersForJobs[0] = userProperties;
      });

      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          usersForJobs[1] = userProperties;
        },
      );

      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        usersForJobs[2] = userProperties;
      });

      // Create test instances and items
      InventoryInstances.createInstanceViaApi(instance.instanceName, instance.itemBarcode);
      cy.wait(1000);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${instance.itemBarcode}"`,
      }).then((instanceData) => {
        instance.itemId = instanceData.items[0].id;
        instance.instanceId = instanceData.id;
        instanceUUIDs.push(instanceData.id);

        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, instance.itemBarcode);
        FileManager.createFile(
          `cypress/fixtures/${instanceUUIDsFileName}`,
          instanceUUIDs.join('\n'),
        );
        FileManager.createFile(
          `cypress/fixtures/${userBarcodesFileName}`,
          `${usersForJobs[1].barcode}`,
        );

        // Execute bulk edit job as first user (Items)
        cy.login(usersForJobs[0].username, usersForJobs[0].password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);

        // Execute bulk edit job as second user (Users)
        cy.login(usersForJobs[1].username, usersForJobs[1].password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        // Execute bulk edit job as third user (Instances)
        cy.login(usersForJobs[2].username, usersForJobs[2].password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.addItemNote('Administrative note', 'test note');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(1);

        // Login with user who has logs view permissions
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      usersForJobs.forEach((jobUser) => {
        if (jobUser && jobUser.userId) {
          Users.deleteViaApi(jobUser.userId);
        }
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C368017 Check the filters section in Logs tab (firebird)',
      { tags: ['extendedPath', 'firebird', 'C368017'] },
      () => {
        const currentDate = DateTools.getCurrentDateForFiscalYear();
        const yesterday = DateTools.getPreviousDayDateForFiscalYear();

        // Step 1: Click on "Logs" toggle from the "Set criteria" in the left side pane
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifySetCriteriaPaneExists();
        BulkEditLogs.verifyLogsPane();

        // Step 2: Check "New" checkbox under "Statuses" accordion on the "Set criteria" pane
        BulkEditLogs.checkLogsCheckbox('New');
        BulkEditLogs.noLogResultsFound();
        BulkEditLogs.verifyClearSelectedFiltersButton('Statuses');
        BulkEditLogs.resetAllBtnIsDisabled(false);

        // Step 3: Click "User" accordion in "Set criteria" pane
        BulkEditLogs.clickUserAccordion();

        // Step 4: Click "Choose user" dropdown under "User" accordion
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.verifyEmptyUserDropdown();
        BulkEditLogs.verifyUserIsInUserList('-List is empty-');
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.clickUserAccordion();

        // Step 5: Check "Completed" checkbox under "Statuses" accordion on the "Set criteria" pane
        BulkEditLogs.checkLogsCheckbox('Completed');
        BulkEditLogs.verifyLogResultsFound();
        BulkEditLogs.verifyLogsPaneHeader();
        BulkEditLogs.verifyCellsValues(2, 'Completed');

        // Step 6: Verify "ID" column of the table
        BulkEditLogs.verifyLogsTableHeaders();
        BulkEditLogs.verifyCellsValues(9, /^\d+$/);

        // Step 7: Click "User" accordion and verify dropdown populated
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.verifyUserIsInUserList(usersForJobs[2].username);
        BulkEditLogs.verifyLogStatus(
          usersForJobs[2].username,
          `${usersForJobs[2].personal.lastName}, ${usersForJobs[2].personal.preferredFirstName} ${usersForJobs[2].personal.middleName}`,
        );
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.clickUserAccordion();

        // Step 8: Check "Inventory - Instances" checkbox under "Record types" accordion
        let recordsCountBeforeFilter;
        BulkEditLogs.getRecordsFoundCount().then((count) => {
          recordsCountBeforeFilter = count;
        });

        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.waitLogsTableLoading();
        cy.wait(10_000); // Wait for the results to be filtered

        let recordsCountAfterFilter;

        BulkEditLogs.getRecordsFoundCount().then((recordsCount) => {
          recordsCountAfterFilter = recordsCount;
          expect(recordsCountBeforeFilter).to.be.greaterThan(recordsCountAfterFilter);
        });

        BulkEditLogs.verifyRecordTypesValues();
        BulkEditLogs.verifyCellsValues(2, 'Completed');
        BulkEditLogs.verifyClearSelectedFiltersButton('Record types');

        // Step 9: Verify User dropdown with Instances filter
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.verifyUserIsInUserList(usersForJobs[2].username);
        BulkEditLogs.verifyLogStatus(
          usersForJobs[2].username,
          `${usersForJobs[2].personal.lastName}, ${usersForJobs[2].personal.preferredFirstName} ${usersForJobs[2].personal.middleName}`,
        );
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.clickUserAccordion();

        // Step 10: Click "Started" accordion in "Set criteria" pane
        BulkEditLogs.clickLogsStartedAccordion();
        BulkEditLogs.verifyLogsStartedAccordionExistsWithElements();

        // Step 11: Pick up any date from the calendar in "From" date picker field
        BulkEditLogs.fillLogsDate('Started', 'From', currentDate);
        BulkEditLogs.verifyClearSelectedDateButtonExists('Started', 'From');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', currentDate);

        // Step 12: Click "Apply" button in the "Started" accordion
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.verifyDateFieldWithError('Started', 'To', 'Please enter an end date');

        // Step 13: Pick up the date earlier than "From" date
        BulkEditLogs.fillLogsDate('Started', 'To', yesterday);
        BulkEditLogs.verifyClearSelectedDateButtonExists('Started', 'To');

        // Step 14: Click "Apply" button with invalid date range
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.verifyDateAccordionValidationMessage(
          'Started',
          'Start date is greater than end date',
        );

        // Step 15: Click "x" icon in "From" date picker field and click "Apply"
        BulkEditLogs.clickClearSelectedDateButton('Started', 'From');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', '');
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.verifyDateFieldWithError('Started', 'From', 'Please enter a start date');

        // Step 16: Pick valid date range and apply
        BulkEditLogs.fillLogsDate('Started', 'From', yesterday);
        BulkEditLogs.fillLogsDate('Started', 'To', currentDate);
        BulkEditLogs.applyStartDateFilters();
        BulkEditLogs.verifyDateCellsValues(6, yesterday, currentDate);
        BulkEditLogs.verifyClearSelectedFiltersButton('Started');

        // Step 17: Verify User dropdown with all filters applied
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.verifyUserIsInUserList(usersForJobs[2].username);
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.clickUserAccordion();

        // Step 18: Click "x" icon of the "Started" accordion
        BulkEditLogs.clickClearStartedFilter();
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'To', '');
        BulkEditLogs.verifyCellsValues(2, 'Completed');
        BulkEditLogs.verifyRecordTypesValues();

        // Step 19: Click on "Ended" accordion in "Search & filter" pane
        BulkEditLogs.clickLogsEndedAccordion();
        BulkEditLogs.verifyLogsEndedAccordionExistsWithElements();

        // Step 20: Pick up the date from the calendar in "From" date picker field
        BulkEditLogs.fillLogsDate('Ended', 'From', yesterday);
        BulkEditLogs.verifyClearSelectedDateButtonExists('Ended', 'From');

        // Step 21: Click "Apply" button in the "Ended" accordion
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyDateFieldWithError('Ended', 'To', 'Please enter an end date');

        // Step 22: Pick date in "To" field and apply
        BulkEditLogs.fillLogsDate('Ended', 'To', currentDate);
        BulkEditLogs.applyEndDateFilters();
        BulkEditLogs.verifyDateCellsValues(7, yesterday, currentDate);
        BulkEditLogs.verifyClearSelectedFiltersButton('Ended');

        // Step 23: Verify User dropdown with Ended filter
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.verifyUserIsInUserList(usersForJobs[2].username);
        BulkEditLogs.verifyLogStatus(
          usersForJobs[2].username,
          `${usersForJobs[2].personal.lastName}, ${usersForJobs[2].personal.preferredFirstName} ${usersForJobs[2].personal.middleName}`,
        );
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.clickUserAccordion();

        // Step 24: Click on the "Reset all" button
        BulkEditLogs.resetAll();
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'From', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Started', 'To', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Ended', 'From', '');
        BulkEditLogs.verifyLogsDateFilledIsEqual('Ended', 'To', '');
        BulkEditLogs.clickLogsStartedAccordion();
        BulkEditLogs.clickLogsEndedAccordion();
        BulkEditLogs.resetAllBtnIsDisabled(true);
        BulkEditSearchPane.verifySetCriteriaPaneExists();
        BulkEditLogs.verifyLogsPane();

        // Step 25: Click "User" accordion and verify all users shown
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.verifyUserIsInUserList(usersForJobs[0].username);
        BulkEditLogs.verifyUserIsInUserList(usersForJobs[1].username);
        BulkEditLogs.verifyUserIsInUserList(usersForJobs[2].username);
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.clickUserAccordion();

        // Step 26: Type a name of any user who executed jobs
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.fillUserFilterInput(usersForJobs[2].username);

        // Step 27: Type a name and press Enter
        BulkEditLogs.selectUserFromDropdown(usersForJobs[2].username);
        BulkEditLogs.verifyClearSelectedButtonExists('User');
        BulkEditLogs.resetAllBtnIsDisabled(false);
        cy.wait(2000); // Wait for the results to be filtered
        BulkEditLogs.verifyCellsValues(
          8,
          `${usersForJobs[2].personal.lastName}, ${usersForJobs[2].personal.preferredFirstName} ${usersForJobs[2].personal.middleName}`,
        );
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.clickUserAccordion();

        // Step 28: Click on dropdown and select different user
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.selectUserFromDropdown(usersForJobs[1].username);
        BulkEditLogs.verifyClearSelectedButtonExists('User');
        BulkEditLogs.resetAllBtnIsDisabled(false);
        cy.wait(2000); // Wait for the results to be filtered
        BulkEditLogs.verifyCellsValues(
          8,
          `${usersForJobs[1].personal.lastName}, ${usersForJobs[1].personal.preferredFirstName} ${usersForJobs[1].personal.middleName}`,
        );
        BulkEditLogs.clickUserAccordion();

        // Step 29: Click on "x" next to "User" filter
        BulkEditLogs.clickClearSelectedButton('User');
        BulkEditLogs.verifyClearSelectedButtonExists('User', false);
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.resetAllBtnIsDisabled(true);

        // Step 30: Type a name of user who did NOT execute jobs
        BulkEditLogs.clickUserAccordion();
        BulkEditLogs.clickChooseUserUnderUserAccordion();
        BulkEditLogs.fillUserFilterInput(user.username);
        BulkEditLogs.verifyUserIsNotInUserList(user.username);
        BulkEditLogs.verifyEmptyUserDropdown();
      },
    );
  });
});
