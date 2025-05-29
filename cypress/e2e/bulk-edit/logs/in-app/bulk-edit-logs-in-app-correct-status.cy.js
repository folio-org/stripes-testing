import TopMenu from '../../../../support/fragments/topMenu';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import Users from '../../../../support/fragments/users/users';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Checkout from '../../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
let servicePointId;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  barcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

function waitForCommitCompletedAndVerify(allias, maxRetries = 10) {
  let retries = 0;

  function checkResponse() {
    return cy.wait(allias, { timeout: getLongDelay() }).then((interception) => {
      if (interception.response.body.status !== 'COMPLETED_WITH_ERRORS') {
        retries++;
        if (retries > maxRetries) {
          throw new Error(
            'Exceeded maximum retry attempts waiting for status to equal "COMPLETED_WITH_ERRORS"',
          );
        }
        cy.wait(1000);
        checkResponse();
      } else {
        expect(interception.response.body.status).to.eq('COMPLETED_WITH_ERRORS');
      }
    });
  }
  checkResponse();
}

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.inventoryAll.gui,
          permissions.exportManagerAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
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
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        CheckInActions.checkinItemViaApi({
          itemBarcode: item.barcode,
          servicePointId,
          checkInDate: new Date().toISOString(),
        });
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C380443 Verify the correctness of the Bulk Edit job status in Logs tab (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C380443'] },
        () => {
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();

          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditActions.replaceItemStatus('Available');
          BulkEditActions.confirmChanges();
          cy.intercept('/bulk-operations/*').as('commitChanges');
          BulkEditActions.commitChanges();
          BulkEditSearchPane.verifyReasonForError('New status value "Available" is not allowed');
          waitForCommitCompletedAndVerify('@commitChanges');

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkItemsCheckbox();
          BulkEditLogs.verifyLogStatus(user.username, 'Completed with errors');
        },
      );
    });
  });
});
