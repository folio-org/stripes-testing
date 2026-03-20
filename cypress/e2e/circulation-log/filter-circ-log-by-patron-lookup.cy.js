import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';

describe('Circulation log', () => {
  describe('Filter Circulation logs by selecting user from Patron look-up', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
    };
    let servicePoint;

    before('Create test data', () => {
      cy.getAdminToken();

      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        servicePoint = sp;
      });

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
      });

      cy.createTempUser([permissions.circulationLogView.gui, permissions.uiUsersView.gui])
        .then((userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(servicePoint.id, testData.user.userId);
        })
        .then(() => {
          Checkout.checkoutItemViaApi({
            itemBarcode: testData.folioInstances[0].barcodes[0],
            servicePointId: servicePoint.id,
            userBarcode: testData.user.barcode,
          });
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.circulationLogPath,
            waiter: SearchPane.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.folioInstances[0].barcodes[0],
        servicePointId: servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint,
        shouldCheckIn: true,
      });
    });

    it(
      'C958914 - Filter Circulation logs by selecting user from "Patron look-up"',
      { tags: ['extendedPath', 'volaris', 'C958914'] },
      () => {
        const itemBarcode = testData.folioInstances[0].barcodes[0];
        const userBarcode = testData.user.barcode;

        // Step 1: Click "Patron look-up" link — "Select User" modal appears
        SearchPane.clickPatronLookup();

        // Step 2: Search for user and select — barcode appears in "User barcode" field
        SearchPane.selectUserInLookupModal(testData.user.username);
        SearchPane.verifyUserBarcodeFieldValue(userBarcode);

        // Step 3: Click on "Item barcode" field
        SearchPane.clickOnItemBarcodeField();

        // Step 4: Type any value into "Item barcode" field
        SearchPane.fillInItemBarcodeField('testValue');

        // Step 5: Clear "Item barcode" with "x" icon, then type real item barcode
        SearchPane.clearItemBarcodeField();
        SearchPane.fillInItemBarcodeField(itemBarcode);

        // Step 6: Click on "Description" field
        SearchPane.clickOnDescriptionField();

        // Step 7: Type any value into "Description" field
        SearchPane.fillInDescriptionField('testDescription');

        // Step 8: Clear "Description" field with "x" icon
        SearchPane.clearDescriptionField();

        // Step 9: Click "Apply" — filter returns at least 1 record
        SearchPane.clickApplyMainFilter();
        SearchPane.verifyResult(userBarcode);

        // Step 10: Click on "Item barcode" field and type in it
        SearchPane.clickOnItemBarcodeField();
        SearchPane.fillInItemBarcodeField('testInput');

        // Step 11: Click on "Description" field and type in it
        SearchPane.clickOnDescriptionField();
        SearchPane.fillInDescriptionField('testDescInput');
      },
    );
  });
});
