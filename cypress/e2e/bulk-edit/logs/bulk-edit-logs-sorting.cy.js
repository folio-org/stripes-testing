import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import Checkout from '../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
let servicePointId;
const usersForJobs = [];
const instances = [
  {
    instanceName: `AT_C543875_Instance1_${getRandomPostfix()}`,
    itemBarcode: `item1_${getRandomPostfix()}`,
  },
  {
    instanceName: `AT_C543875_Instance2_${getRandomPostfix()}`,
    itemBarcode: `item2_${getRandomPostfix()}`,
  },
  {
    instanceName: `AT_C543875_Instance3_${getRandomPostfix()}`,
    itemBarcode: `item3_${getRandomPostfix()}`,
  },
];
const itemBarcodesFileName = `itemBarcodes_C543875_${getRandomPostfix()}.csv`;
const singleItemBarcodeFileName = `singleItemBarcode_C543875_${getRandomPostfix()}.csv`;
const holdingUUIDsFileName = `holdingUUIDs_C543875_${getRandomPostfix()}.csv`;
const instanceUUIDsFileName = `instanceUUIDs_C543875_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_C543875_${getRandomPostfix()}.csv`;

function waitForBulkOperationStatus(alias, expectedStatus, maxRetries = 10) {
  let retries = 0;

  function checkResponse() {
    return cy.wait(alias, { timeout: getLongDelay() }).then((interception) => {
      if (interception.response.body.status !== expectedStatus) {
        retries++;
        if (retries > maxRetries) {
          throw new Error(`Exceeded maximum retry attempts waiting for status "${expectedStatus}"`);
        }
        cy.wait(1000);
        checkResponse();
      }
    });
  }
  checkResponse();
}

describe('Bulk-edit', () => {
  describe('Logs', () => {
    before('create test data', () => {
      cy.getAdminToken();

      // Create user for viewing logs (test actor)
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditView.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });

      // Create first user for bulk edit jobs (Items + Holdings - in-app approach)
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        usersForJobs[0] = userProperties;
      });

      // Create second user for bulk edit jobs (Users - CSV approach)
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          usersForJobs[1] = userProperties;
        },
      );

      // Create third user for bulk edit jobs (Instances - in-app approach)
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        usersForJobs[2] = userProperties;
      });

      // Create 3 test inventory instances with items
      instances.forEach((instance) => {
        InventoryInstances.createInstanceViaApi(instance.instanceName, instance.itemBarcode);
      });

      // Wait for instance creation, gather IDs, and set up checkout for "Completed with errors" job
      cy.wait(1000);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${instances[0].itemBarcode}"`,
      }).then((instanceData) => {
        instances[0].instanceId = instanceData.id;
        instances[0].holdingId = instanceData.holdings[0].id;
        instances[0].itemId = instanceData.items[0].id;

        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"items.barcode"=="${instances[1].itemBarcode}"`,
        }).then((instanceData2) => {
          instances[1].instanceId = instanceData2.id;
          instances[1].holdingId = instanceData2.holdings[0].id;
          instances[1].itemId = instanceData2.items[0].id;

          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"items.barcode"=="${instances[2].itemBarcode}"`,
          }).then((instanceData3) => {
            instances[2].instanceId = instanceData3.id;
            instances[2].holdingId = instanceData3.holdings[0].id;
            instances[2].itemId = instanceData3.items[0].id;

            // Check out the third item to create a scenario for "Completed with errors"
            ServicePoints.getCircDesk1ServicePointViaApi()
              .then((servicePoint) => {
                servicePointId = servicePoint.id;
              })
              .then(() => {
                UserEdit.addServicePointViaApi(
                  servicePointId,
                  usersForJobs[0].userId,
                  servicePointId,
                );
                Checkout.checkoutItemViaApi({
                  itemBarcode: instances[2].itemBarcode,
                  servicePointId,
                  userBarcode: usersForJobs[0].barcode,
                });
              });

            // Create CSV files for bulk edit uploads
            FileManager.createFile(
              `cypress/fixtures/${itemBarcodesFileName}`,
              `${instances[0].itemBarcode}\n${instances[1].itemBarcode}`,
            );
            FileManager.createFile(
              `cypress/fixtures/${singleItemBarcodeFileName}`,
              instances[2].itemBarcode,
            );
            FileManager.createFile(
              `cypress/fixtures/${holdingUUIDsFileName}`,
              `${instances[0].holdingId}\n${instances[1].holdingId}`,
            );
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              `${instances[0].instanceId}\n${instances[1].instanceId}`,
            );
            FileManager.createFile(
              `cypress/fixtures/${userBarcodesFileName}`,
              usersForJobs[1].barcode,
            );

            // --- Job 1: Items upload (2 records) as user1 - In-app, Completed ---
            cy.login(usersForJobs[0].username, usersForJobs[0].password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
            BulkEditSearchPane.uploadFile(itemBarcodesFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditSearchPane.verifyMatchedResults(
              instances[0].itemBarcode,
              instances[1].itemBarcode,
            );

            // --- Job 2: Holdings upload (2 records) as user1 - In-app, Completed ---
            BulkEditSearchPane.clickToBulkEditMainButton();
            BulkEditSearchPane.checkHoldingsRadio();
            BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
            BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();

            // --- Job 3: Items with checked-out item (1 record) as user1 - In-app, Completed with errors ---
            // Attempt to change status of checked-out item to "Available" to produce error
            BulkEditSearchPane.clickToBulkEditMainButton();
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.selectRecordIdentifier('Item barcodes');
            BulkEditSearchPane.uploadFile(singleItemBarcodeFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.replaceItemStatus('Available');
            BulkEditActions.confirmChanges();
            cy.intercept('/bulk-operations/*').as('commitErrorJob');
            BulkEditActions.commitChanges();
            waitForBulkOperationStatus('@commitErrorJob', 'COMPLETED_WITH_ERRORS');

            // --- Job 4: Users bulk edit (1 record) as user2 - CSV, Completed ---
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

            // --- Job 5: Instances bulk edit (2 records) as user3 - In-app, Completed ---
            cy.login(usersForJobs[2].username, usersForJobs[2].password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea(
              'Instance',
              'Instance UUIDs',
            );
            BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
            BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.openActions();
            BulkEditActions.openStartBulkEditFolioInstanceForm();
            BulkEditActions.addItemNote('Administrative note', 'test note C543875');
            BulkEditActions.confirmChanges();
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            // Login with the logs-viewing user for the test
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      // Check in the checked-out item before deleting
      CheckInActions.checkinItemViaApi({
        itemBarcode: instances[2].itemBarcode,
        servicePointId,
        checkInDate: new Date().toISOString(),
      });
      Users.deleteViaApi(user.userId);
      usersForJobs.forEach((jobUser) => {
        if (jobUser?.userId) {
          Users.deleteViaApi(jobUser.userId);
        }
      });
      instances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
      });
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${singleItemBarcodeFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
    });

    it(
      'C543875 Verify sorting in "Bulk edit" logs table (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C543875'] },
      () => {
        cy.viewport(2560, 1440);

        // Step 1: Navigate to Logs tab and verify elements on "Set criteria" pane and main pane
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();

        // Step 2: Check checkboxes next to all record types
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.checkInstancesCheckbox();
        BulkEditLogs.resetAllBtnIsDisabled(false);
        BulkEditLogs.verifyLogsPaneHeader();
        BulkEditLogs.verifyLogsTableHeaders();

        // Step 3: Verify default sorting by "Ended" column in descending order
        BulkEditLogs.verifyDirection('Ended');

        // Step 4: Verify "up-down" icon next to other sortable columns, no icon next to "Actions"
        [
          'Record type',
          'Status',
          'Editing',
          '# of records',
          'Processed',
          'Started',
          'Run by',
          'ID',
        ].forEach((col) => {
          BulkEditLogs.verifyNoDirection(col);
        });

        // Step 5: Click "Ended" column - ascending
        BulkEditLogs.clickLogHeader('Ended');
        BulkEditLogs.verifyDirection('Ended', 'ascending');

        // Step 6: Click "Ended" column again - descending
        BulkEditLogs.clickLogHeader('Ended');
        BulkEditLogs.verifyDirection('Ended');

        // Step 7: Click "Record type" - ascending, "Ended" resets to up-down
        BulkEditLogs.clickLogHeader('Record type');
        BulkEditLogs.verifyNoDirection('Ended');
        BulkEditLogs.verifyDirection('Record type', 'ascending');

        // Step 8: Click "Record type" again - descending
        BulkEditLogs.clickLogHeader('Record type');
        BulkEditLogs.verifyDirection('Record type');

        // Step 9: Click "Status" - ascending, "Record type" resets to up-down
        BulkEditLogs.clickLogHeader('Status');
        BulkEditLogs.verifyNoDirection('Record type');
        BulkEditLogs.verifyDirection('Status', 'ascending');

        // Step 10: Click "Status" again - descending
        BulkEditLogs.clickLogHeader('Status');
        BulkEditLogs.verifyDirection('Status');

        // Step 11: Click "Editing" - ascending, "Status" resets to up-down
        BulkEditLogs.clickLogHeader('Editing');
        BulkEditLogs.verifyNoDirection('Status');
        BulkEditLogs.verifyDirection('Editing', 'ascending');

        // Step 12: Click "Editing" again - descending
        BulkEditLogs.clickLogHeader('Editing');
        BulkEditLogs.verifyDirection('Editing');

        // Step 13: Click "# of records" - ascending, "Editing" resets to up-down
        BulkEditLogs.clickLogHeader('# of records');
        BulkEditLogs.verifyNoDirection('Editing');
        BulkEditLogs.verifyDirection('# of records', 'ascending');

        // Step 14: Click "# of records" again - descending
        BulkEditLogs.clickLogHeader('# of records');
        BulkEditLogs.verifyDirection('# of records');

        // Step 15: Check "Completed" status checkbox - sorting preserved
        BulkEditLogs.checkLogsCheckbox('Completed');
        BulkEditLogs.verifyDirection('# of records');
        BulkEditLogs.resetAllBtnIsDisabled(false);

        // Step 16: Click "Processed" - ascending, "# of records" resets to up-down
        BulkEditLogs.clickLogHeader('Processed');
        BulkEditLogs.verifyNoDirection('# of records');
        BulkEditLogs.verifyDirection('Processed', 'ascending');

        // Step 17: Click "Processed" again - descending
        BulkEditLogs.clickLogHeader('Processed');
        BulkEditLogs.verifyDirection('Processed');

        // Step 18: Reset statuses - sorting preserved
        BulkEditLogs.resetStatuses();
        BulkEditLogs.verifyDirection('Processed');
        BulkEditLogs.resetAllBtnIsDisabled(false);

        // Step 19: Click "Run by" - ascending, "Processed" resets to up-down
        BulkEditLogs.clickLogHeader('Run by');
        BulkEditLogs.verifyNoDirection('Processed');
        BulkEditLogs.verifyDirection('Run by', 'ascending');

        // Step 20: Click "Run by" again - descending
        BulkEditLogs.clickLogHeader('Run by');
        BulkEditLogs.verifyDirection('Run by');

        // Step 21: Reload page - sorting preserved
        cy.reload();
        BulkEditLogs.waitLogsTableLoading();
        BulkEditLogs.verifyDirection('Run by');
        BulkEditLogs.resetAllBtnIsDisabled(false);

        // Step 22: Click "ID" - ascending, "Run by" resets to up-down
        BulkEditLogs.clickLogHeader('ID');
        BulkEditLogs.verifyNoDirection('Run by');
        BulkEditLogs.verifyDirection('ID', 'ascending');

        // Step 23: Click "ID" again - descending
        BulkEditLogs.clickLogHeader('ID');
        BulkEditLogs.verifyDirection('ID');

        // Step 24: Click "Started" - ascending, "ID" resets to up-down
        BulkEditLogs.clickLogHeader('Started');
        BulkEditLogs.verifyNoDirection('ID');
        BulkEditLogs.verifyDirection('Started', 'ascending');

        // Step 25: Click "Started" again - descending
        BulkEditLogs.clickLogHeader('Started');
        BulkEditLogs.verifyDirection('Started');

        // Step 27: Navigate to Identifier tab and back to Logs - sorting preserved
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.waitLogsTableLoading();
        BulkEditLogs.verifyDirection('Started');
      },
    );
  });
});
