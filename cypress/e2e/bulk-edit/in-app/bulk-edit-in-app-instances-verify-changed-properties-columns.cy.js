import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
const instance = {
  title: `C431145 instance-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const optionsToSelect = {
  staffSuppress: 'Staff suppress',
  suppressFromDiscovery: 'Suppress from discovery',
};
const actionsToSelect = {
  setTrue: 'Set true',
};
const instanceUUIDsFileName = `validInstanceUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        user = userProperties;

        instance.instanceId = InventoryInstances.createInstanceViaApi(
          instance.title,
          instance.itemBarcode,
        );
        cy.wait(3000);

        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"id"=="${instance.instanceId}"`,
        }).then((instanceData) => {
          instance.instanceHRID = instanceData.hrid;

          FileManager.createFile(
            `cypress/fixtures/${instanceUUIDsFileName}`,
            `${instance.instanceId}`,
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
    });

    it(
      'C431145 Verify only changed properties columns appear on "Are you sure?" form and on Confirmation screen - Instances (firebird)',
      { tags: ['criticalPath', 'firebird', 'C431145'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          instance.instanceHRID,
        );
        BulkEditActions.openActions();
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          false,
        );
        BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
        );
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.selectOption(optionsToSelect.staffSuppress);
        BulkEditActions.selectAction(actionsToSelect.setTrue);
        BulkEditActions.verifyOptionSelected(optionsToSelect.staffSuppress);
        BulkEditActions.verifyActionSelected(actionsToSelect.setTrue);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.selectOption(optionsToSelect.suppressFromDiscovery, 1);
        BulkEditActions.selectAction(actionsToSelect.setTrue, 1);
        BulkEditActions.verifyOptionSelected(optionsToSelect.suppressFromDiscovery, 1);
        BulkEditActions.verifyActionSelected(actionsToSelect.setTrue, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.deleteRow(1);
        BulkEditActions.verifyRowWithOptionAbsent(optionsToSelect.suppressFromDiscovery);
        BulkEditActions.verifyRowWithOptionExists(optionsToSelect.staffSuppress);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          [instance.instanceHRID],
        );
        BulkEditActions.verifyAreYouSureForm(1, instance.instanceHRID);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          ['true'],
        );
        BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditActions.verifyActionsButtonDisabled(false);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.instanceHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.INSTANCE_HRID,
          instance.instanceHRID,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.instanceHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.STAFF_SUPPRESS,
          'true',
        );
        BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_INSTANCES.SUPPRESS_FROM_DISCOVERY,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.selectYesfilterStaffSuppress();
        InventorySearchAndFilter.searchInstanceByTitle(instance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
      },
    );
  });
});
