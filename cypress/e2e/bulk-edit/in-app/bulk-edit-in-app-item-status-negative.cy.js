import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import UserEdit from '../../../support/fragments/users/userEdit';
import Checkout from '../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ExportFile from '../../../support/fragments/data-export/exportFile';

let user;
let servicePointId;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const errorsFromCommittingFileName = `*-Committing-changes-Errors-${itemBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' })
          .then((servicePoints) => {
            servicePointId = servicePoints[0].id;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
            Checkout.checkoutItemViaApi({
              itemBarcode: item.barcode,
              servicePointId,
              userBarcode: user.barcode,
            });
            FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, item.barcode);
          });
      });
    });
  
    after('delete test data', () => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId,
        checkInDate: new Date().toISOString(),
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(errorsFromCommittingFileName);
    });

    it(
      'C357068 Negative: Verify Items status update (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');
  
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceItemStatus('Available');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.verifyReasonForError('New status value "Available" is not allowed');
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyNoChangesPreview();
        BulkEditActions.downloadErrors();
        ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          'New status value "Available" is not allowed',
        ]);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', item.barcode);
        ItemRecordView.verifyItemStatus('Checked out');
      },
    );
  });
});
