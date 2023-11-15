import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import Checkout from '../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';

let user;
let servicePointId;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instance-${getRandomPostfix()}`,
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
        ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 1"' }).then((servicePoints) => {
          servicePointId = servicePoints[0].id;
        }).then(() => {
          UserEdit.addServicePointViaApi(servicePointId, user.userId, servicePointId);
          cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item.barcode}"` }).then(
            (res) => {
              const itemData = res;
              // Annex location
              itemData.permanentLocation = { id: '53cf956f-c1df-410b-8bea-27f712cca7c0' };
              itemData.temporaryLocation = { id: '53cf956f-c1df-410b-8bea-27f712cca7c0' };
              // Selected loan type
              itemData.permanentLoanType = { id: 'a1dc1ce3-d56f-4d8a-b498-d5d674ccc845' };
              itemData.temporaryLoanType = { id: 'a1dc1ce3-d56f-4d8a-b498-d5d674ccc845' };
              cy.updateItemViaApi(itemData);
            }
          );
        }).then(() => {
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
    });

    it(
      'C380491 Verify that User can bulk edit items with "Checked Out" or "Paged" status (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcode');

        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.barcode);

        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Permanent loan type',
          'Temporary loan type',
          'Item permanent location',
          'Item temporary location',
          'Suppress from discovery'
        );
        BulkEditActions.openInAppStartBulkEditFrom();
        const location = 'Online';
        BulkEditActions.replaceTemporaryLocation(location);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replacePermanentLocation(location, 'item', 1);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillPermanentLoanType('Can circulate', 2);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.fillTemporaryLoanType('Can circulate', 3);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.editSuppressFromDiscovery('true', 4);
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.replaceItemStatus('Available', 5);

        BulkEditActions.confirmChanges();
        BulkEditActions.verifyChangesInAreYouSureForm('Item temporary location', ['Online']);
        BulkEditActions.verifyChangesInAreYouSureForm('Item permanent location', ['Online']);
        BulkEditActions.verifyChangesInAreYouSureForm('Permanent loan type', ['Can circulate']);
        BulkEditActions.verifyChangesInAreYouSureForm('Temporary loan type', ['Can circulate']);
        BulkEditActions.verifyChangesInAreYouSureForm('Suppress from discovery', ['true']);
        BulkEditActions.verifyChangesInAreYouSureForm('Status', ['Available']);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyChangesUnderColumns('Item temporary location', 'Online');
        BulkEditSearchPane.verifyChangesUnderColumns('Item permanent location', 'Online');
        BulkEditSearchPane.verifyChangesUnderColumns('Permanent loan type', 'Can circulate');
        BulkEditSearchPane.verifyChangesUnderColumns('Temporary loan type', 'Can circulate');
        BulkEditSearchPane.verifyChangesUnderColumns('Suppress from discovery', 'true');
        BulkEditSearchPane.verifyChangesUnderColumns('Status', 'Checked out');
        BulkEditSearchPane.verifyReasonForError('New status value "Available" is not allowed');
      },
    );
  });
});
