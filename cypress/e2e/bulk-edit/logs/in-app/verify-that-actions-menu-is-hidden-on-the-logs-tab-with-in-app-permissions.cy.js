import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create user', () => {
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.inventoryAll.gui,
          permissions.uiUserEdit.gui,
          permissions.uiUserCanAssignUnassignPermissions.gui,
        ]).then((userProperties) => {
          user = userProperties;
          InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C367996 Verify that "Actions" menu is hidden on the "Logs" tab with In-app permissions (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C367996'] },
        () => {
          BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
          BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
          BulkEditSearchPane.isHoldingsRadioChecked(false);
          BulkEditSearchPane.isItemsRadioChecked(false);
          BulkEditSearchPane.actionsIsAbsent();

          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditSearchPane.actionsIsAbsent();

          BulkEditLogs.checkItemsCheckbox();
          BulkEditLogs.verifyActionsRunBy(
            `${user.username}, ${Users.defaultUser.personal.preferredFirstName} ${Users.defaultUser.personal.middleName}`,
          );
        },
      );
    });
  });
});
