import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import CheckOutModal from '../../support/fragments/check-out-actions/checkOutModal';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import { ServicePoints } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';

describe('Check out', () => {
  const itemBarcodes = {
    withLeadingSpace: ` ${generateUniqueItemBarcodeWithShift()}`,
    withTrailingSpace: `${generateUniqueItemBarcodeWithShift()} `,
    withoutSpace: generateUniqueItemBarcodeWithShift(),
  };
  const checkoutNotes = {
    withLeadingSpace: 'space at the beginning',
    withTrailingSpace: 'space at the end',
    withoutSpace: 'no space',
  };
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 3,
      itemsProperties: [
        { barcode: itemBarcodes.withLeadingSpace },
        { barcode: itemBarcodes.withTrailingSpace },
        { barcode: itemBarcodes.withoutSpace },
      ],
    }),
  };
  let servicePoint;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      servicePoint = sp;
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
      });
      cy.createTempUser([Permissions.checkoutAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        testData.user.personal = { lastname: userProperties.username };
        UserEdit.addServicePointViaApi(servicePoint.id, testData.user.userId, servicePoint.id);

        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${itemBarcodes.withLeadingSpace}"`,
        }).then((res) => {
          const itemData = res;
          itemData.circulationNotes = [
            { noteType: 'Check out', note: checkoutNotes.withLeadingSpace, staffOnly: true },
          ];
          InventoryItems.editItemViaApi(itemData);
        });

        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${itemBarcodes.withTrailingSpace}"`,
        }).then((res) => {
          const itemData = res;
          itemData.circulationNotes = [
            { noteType: 'Check out', note: checkoutNotes.withTrailingSpace, staffOnly: true },
          ];
          InventoryItems.editItemViaApi(itemData);
        });

        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${itemBarcodes.withoutSpace}"`,
        }).then((res) => {
          const itemData = res;
          itemData.circulationNotes = [
            { noteType: 'Check out', note: checkoutNotes.withoutSpace, staffOnly: true },
          ];
          InventoryItems.editItemViaApi(itemData);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.checkOutPath,
            waiter: Checkout.waitLoading,
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    testData.folioInstances.forEach((instance) => {
      InventoryInstances.deleteInstanceViaApi({
        instance,
        servicePoint,
        shouldCheckIn: true,
      });
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C566158 Check that Item barcode is not trimming if there is spaces in the Item barcode while check out (vega)',
    { tags: ['extendedPath', 'vega', 'C566158'] },
    () => {
      CheckOutActions.checkOutUser(testData.user.barcode);
      CheckOutActions.checkUserInfo(testData.user);

      CheckOutActions.checkOutItem(itemBarcodes.withLeadingSpace);
      CheckOutModal.verifyModalTitle();
      CheckOutModal.verifyModalMessage(checkoutNotes.withLeadingSpace);
      CheckOutModal.confirmModal();
      CheckOutActions.verifyItemCheckedOut(itemBarcodes.withLeadingSpace);

      CheckOutActions.checkOutItem(itemBarcodes.withTrailingSpace);
      CheckOutModal.verifyModalTitle();
      CheckOutModal.verifyModalMessage(checkoutNotes.withTrailingSpace);
      CheckOutModal.confirmModal();
      CheckOutActions.verifyItemCheckedOut(itemBarcodes.withTrailingSpace);

      CheckOutActions.checkOutItem(itemBarcodes.withoutSpace);
      CheckOutModal.verifyModalTitle();
      CheckOutModal.verifyModalMessage(checkoutNotes.withoutSpace);
      CheckOutModal.confirmModal();
      CheckOutActions.verifyItemCheckedOut(itemBarcodes.withoutSpace);
    },
  );
});
