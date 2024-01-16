import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create user', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.inventoryAll.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersPermissions.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);

      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C367996 Verify that "Actions" menu is hidden on the "Logs" tab with In-app permissions (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.actionsIsAbsent();

        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.actionsIsAbsent();

        BulkEditSearchPane.checkItemsCheckbox();
        BulkEditSearchPane.verifyActionsRunBy(
          `${user.username}, ${user.firstName} ${Users.defaultUser.personal.middleName}`,
        );
      },
    );
  });
});
