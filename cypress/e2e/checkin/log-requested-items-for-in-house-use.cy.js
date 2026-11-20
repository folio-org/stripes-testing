import CapabilitySets from '../../support/dictionary/capabilitySets';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  FULFILMENT_PREFERENCES,
  LOCATION_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';

describe('Check in', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ itemsCount: 3 }),
  };
  let item1;
  let item2;
  let item3;
  let effectiveSP;
  let differentSP;

  before('Create test data', () => {
    item1 = testData.folioInstances[0].items[0];
    item2 = testData.folioInstances[0].items[1];
    item3 = testData.folioInstances[0].items[2];

    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp1) => {
        effectiveSP = sp1;
      });
      ServicePoints.getCircDesk2ServicePointViaApi().then((sp2) => {
        differentSP = sp2;
      });
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
        testData.mainLibraryLocationId = res.id;
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: { id: testData.mainLibraryLocationId },
        });
      });
      // Borrower patron needed for Hold/Recall requests (items must be on loan)
      cy.createTempUser([]).then((borrowerProps) => {
        testData.borrower = borrowerProps;
        UserEdit.addServicePointsViaApi([effectiveSP.id], testData.borrower.userId, effectiveSP.id);
        Checkout.checkoutItemViaApi({
          itemBarcode: item2.barcode,
          servicePointId: effectiveSP.id,
          userBarcode: testData.borrower.barcode,
        });
        Checkout.checkoutItemViaApi({
          itemBarcode: item3.barcode,
          servicePointId: effectiveSP.id,
          userBarcode: testData.borrower.barcode,
        });
      });
    });

    cy.createTempUser([]).then((createdUserProperties) => {
      testData.user = createdUserProperties;
      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiCheckin, CapabilitySets.uiRequestsView],
      );
      UserEdit.addServicePointsViaApi(
        [effectiveSP.id, differentSP.id],
        testData.user.userId,
        effectiveSP.id,
      );
      // Hold request for item 2 (item is on loan to borrower)
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.folioInstances[0].holdingId,
        instanceId: testData.folioInstances[0].instanceId,
        item: { barcode: item2.barcode },
        itemId: item2.id,
        pickupServicePointId: effectiveSP.id,
        requestDate: new Date(),
        requestExpirationDate: new Date(new Date().getTime() + 86400000),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.HOLD,
        requesterId: testData.user.userId,
      }).then((req) => {
        testData.requestIdItem2 = req.body.id;
      });
      // Recall request for item 3 (item is on loan to borrower)
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.folioInstances[0].holdingId,
        instanceId: testData.folioInstances[0].instanceId,
        item: { barcode: item3.barcode },
        itemId: item3.id,
        pickupServicePointId: effectiveSP.id,
        requestDate: new Date(),
        requestExpirationDate: new Date(new Date().getTime() + 86400000),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.RECALL,
        requesterId: testData.user.userId,
      }).then((req) => {
        testData.requestIdItem3 = req.body.id;
      });
      // Check in items 2 and 3 at differentSP to put them "In transit" (precondition)
      CheckInActions.checkinItemViaApi({
        itemBarcode: item2.barcode,
        servicePointId: differentSP.id,
      });
      CheckInActions.checkinItemViaApi({
        itemBarcode: item3.barcode,
        servicePointId: differentSP.id,
      });
      // Page request for item 1 (item is available)
      Requests.createNewRequestViaApi({
        fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        holdingsRecordId: testData.folioInstances[0].holdingId,
        instanceId: testData.folioInstances[0].instanceId,
        item: { barcode: item1.barcode },
        itemId: item1.id,
        pickupServicePointId: effectiveSP.id,
        requestDate: new Date(),
        requestExpirationDate: new Date(new Date().getTime() + 86400000),
        requestLevel: REQUEST_LEVELS.ITEM,
        requestType: REQUEST_TYPES.PAGE,
        requesterId: testData.user.userId,
      }).then((req) => {
        testData.requestIdItem1 = req.body.id;
      });
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.requestIdItem1) Requests.deleteRequestViaApi(testData.requestIdItem1);
    if (testData.requestIdItem2) Requests.deleteRequestViaApi(testData.requestIdItem2);
    if (testData.requestIdItem3) Requests.deleteRequestViaApi(testData.requestIdItem3);
    if (testData.user) Users.deleteViaApi(testData.user.userId);
    if (testData.borrower) Users.deleteViaApi(testData.borrower.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: effectiveSP,
      shouldCheckIn: true,
    });
  });

  it(
    'C1602434 Log requested items for in-house use during the check-in process (vega)',
    { tags: ['extendedPath', 'vega', 'C1602434'] },
    () => {
      cy.intercept('POST', 'circulation/check-in-by-barcode').as('checkIn');

      // Step 1: Select service point different from effective location SP — "In-house use" checkbox is displayed unchecked
      SwitchServicePoint.switchServicePoint(differentSP.name);
      SwitchServicePoint.checkIsServicePointSwitched(differentSP.name);
      CheckInActions.verifyInHouseUseCheckbox(false);

      // Step 2: Check "In-house use" checkbox — checkbox becomes checked
      CheckInActions.checkInHouseUseCheckbox();
      CheckInActions.verifyInHouseUseCheckbox(true);

      // Step 3: Check in Item 1 (Available with Page request) — "In transit" popup appears
      CheckInActions.checkInItemGui(item1.barcode);
      InTransit.verifyModalTitle();

      // Step 4: Close "In transit" popup — checkbox remains checked, in-house use icon appears, inHouseUse: true
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', true);

      // Step 5: Check in Item 2 (In transit with Hold request) — "In transit" popup appears
      CheckInActions.checkInItemGui(item2.barcode);
      InTransit.verifyModalTitle();

      // Step 6: Close "In transit" popup — checkbox remains checked, in-house use icon appears, inHouseUse: true
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', true);

      // Step 7: Check in Item 3 (In transit with Recall request) — "In transit" popup appears
      CheckInActions.checkInItemGui(item3.barcode);
      InTransit.verifyModalTitle();

      // Step 8: Close "In transit" popup — checkbox remains checked, in-house use icon appears, inHouseUse: true
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', true);

      // Step 9: Navigate to Requests app — all requests from preconditions show "Open - In transit"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.REQUESTS);
      Requests.waitLoading();
      Requests.selectInTransitRequest();
      Requests.verifyItemBarcodeInList(item1.barcode);
      Requests.verifyItemBarcodeInList(item2.barcode);
      Requests.verifyItemBarcodeInList(item3.barcode);
    },
  );
});
