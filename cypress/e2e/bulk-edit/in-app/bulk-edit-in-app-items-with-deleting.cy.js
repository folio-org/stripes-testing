import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let servicePointId;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemToBeDeleted = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const invalidBarcode = getRandomPostfix();

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
          .then((servicePoints) => {
            servicePointId = servicePoints[0].id;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
          });

        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        InventoryInstances.createInstanceViaApi(
          itemToBeDeleted.instanceName,
          itemToBeDeleted.itemBarcode,
        );

        FileManager.createFile(
          `cypress/fixtures/${itemBarcodesFileName}`,
          `${item.itemBarcode}\r\n${invalidBarcode}\r\n${itemToBeDeleted.itemBarcode}`,
        );
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C353230 Verify completion of the in-app bulk edit (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C353230'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation();
        BulkEditActions.confirmChanges();

        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          itemToBeDeleted.itemBarcode,
        );

        cy.getToken(user.username, user.password);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditActions.verifyActionAfterChangingRecords();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditActions.verifySuccessBanner(1);
      },
    );
  });
});
