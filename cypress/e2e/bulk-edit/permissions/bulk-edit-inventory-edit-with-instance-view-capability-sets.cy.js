import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const folioInstance = {
  title: `AT_C423646_FolioInstance_${getRandomPostfix()}`,
};
const instanceUUIDsFileName = `AT_C423646_instance_uuids_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.getAdminToken();

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            const instanceTypeId = instanceTypes[0].id;

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstance.title,
              },
            }).then((createdInstanceData) => {
              folioInstance.instanceId = createdInstanceData.instanceId;
            });
          })
          .then(() => {
            FileManager.createFile(
              `cypress/fixtures/${instanceUUIDsFileName}`,
              folioInstance.instanceId,
            );
          });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
    });

    it(
      'C423646 User with "data - UI-Bulk-Edit Inventory - edit" and "data - UI-Inventory Instance - view" capability sets is NOT able to start bulk edit of Instances (firebird)',
      { tags: ['extendedPath', 'firebird', 'C423646'] },
      () => {
        // Step 1: Check the "Bulk edit" main pane
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyDefaultFilterState();

        // Step 2: Check the "Set criteria" left side pane
        BulkEditSearchPane.verifySetCriteriaPaneItems(false, false);
        BulkEditSearchPane.verifyRecordIdentifierDisabled();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // Step 3: Check record types radio buttons under the "Record types" accordion
        BulkEditSearchPane.verifyRecordTypesSortedAlphabetically();
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        BulkEditSearchPane.isInstancesRadioChecked(false);
        BulkEditSearchPane.isItemsRadioChecked(false);

        // Step 4: Click "Record identifier" dropdown
        BulkEditSearchPane.verifyRecordIdentifierDisabled();

        // Step 5: Check "Drag and drop" area
        BulkEditSearchPane.dragAndDropAreaExists(true);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // Step 6: Select "Inventory - instances" radio button
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        BulkEditSearchPane.isInstancesRadioChecked(true);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.verifyRecordIdentifierDisabled(false);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        BulkEditSearchPane.dragAndDropAreaExists(true);

        // Step 7-8: Select "Instance UUIDs" from the dropdown
        BulkEditSearchPane.verifyRecordIdentifiers(['Instance UUIDs', 'Instance HRIDs']);
        BulkEditSearchPane.selectRecordIdentifier('Instance UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);

        // Step 9: Upload the CSV file with Instance UUIDs
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 10: Check the result of uploading the CSV file
        BulkEditSearchPane.verifyMatchedResults(folioInstance.title);

        // Step 11: Click "Actions" menu and verify available options
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedRecordsExists();
        BulkEditActions.startBulkEditAbsent();
      },
    );
  });
});
