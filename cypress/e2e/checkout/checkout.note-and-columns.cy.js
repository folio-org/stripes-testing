import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { ServicePoints } from '../../support/fragments/settings/tenant';
import { Permissions } from '../../support/dictionary';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import CheckOutModal from '../../support/fragments/check-out-actions/checkOutModal';
import DateTools from '../../support/utils/dateTools';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';

describe('Check out', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
  };
  let servicePoint;

  const note1 = { title: 'Note 1', source: 'ADMINISTRATOR, DIKU' };
  const note2 = { title: 'Note 2', source: 'ADMINISTRATOR, DIKU' };
  const itemBarcode = testData.folioInstances[0].barcodes[0];

  before('Creating data', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      servicePoint = sp;
    });
    cy.getAdminSourceRecord().then((record) => {
      note1.source = record;
      note2.source = record;
    });
    InventoryInstances.createFolioInstancesViaApi({
      folioInstances: testData.folioInstances,
      location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
    });
    cy.createTempUser([Permissions.checkoutCirculatingItems.gui]).then((userProperties) => {
      testData.user = userProperties;
      UserEdit.addServicePointViaApi(servicePoint.id, testData.user.userId, servicePoint.id);

      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${itemBarcode}"`,
      }).then((res) => {
        const itemData = res;
        note1.date = DateTools.getFormattedDateWithTime(new Date(), { withoutComma: true });
        itemData.circulationNotes = [{ noteType: 'Check out', note: note1.title, staffOnly: true }];
        InventoryItems.editItemViaApi(itemData);
      });
      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${itemBarcode}"`,
      }).then((res) => {
        const itemData = res;
        note2.date = DateTools.getFormattedDateWithTime(new Date(), { withoutComma: true });
        itemData.circulationNotes = [
          ...itemData.circulationNotes,
          {
            noteType: 'Check out',
            note: note2.title,
            staffOnly: true,
          },
        ];
        InventoryItems.editItemViaApi(itemData);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.checkOutPath,
          waiter: Checkout.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint,
      shouldCheckIn: true,
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C778 Check out: check out note and columns on "Scan items" pane (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C778'] },
    () => {
      // Enter barcode for a user in the Check Out app.
      CheckOutActions.checkOutUser(testData.user.barcode);
      // Enter barcode for item with at least two check out notes.
      CheckOutActions.checkOutItem(itemBarcode);
      CheckOutModal.verifyModalTitle();
      CheckOutModal.verifyNotesInfo([note2, note1]);
      // Click cancel on the Check out note modal.
      CheckOutModal.closeModal();
      CheckOutModal.verifyModalIsClosed();
      CheckOutActions.checkItemIsNotCheckedOut(itemBarcode);
      // Enter barcode for the item again
      CheckOutActions.checkOutItem(itemBarcode);
      CheckOutModal.verifyModalTitle();
      CheckOutModal.verifyNotesInfo([note2, note1]);
      // Click Confirm on the check out note modal.
      CheckOutModal.confirmModal();
      CheckOutActions.checkItemInfo(itemBarcode, testData.folioInstances[0].instanceTitle);
      // Open Check out notes
      CheckOutActions.openCheckOutNotes();
      CheckOutModal.verifyNotesInfo([note2, note1], true);
      // Click close.
      CheckOutActions.closeNote();
      CheckOutModal.verifyModalIsClosed();
    },
  );
});
