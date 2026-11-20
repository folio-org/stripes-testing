import moment from 'moment';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import InHouseUseConfirmModal from '../../support/fragments/checkin/modals/inHouseUseConfirmModal';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../support/constants';
import Modals from '../../support/fragments/modals';

describe('Check in', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ itemsCount: 2 }),
  };
  let item1;
  let item2;
  let effectiveSP;
  const todayDate = moment(new Date()).format('M/D/YYYY');

  before('Create test data', () => {
    item1 = testData.folioInstances[0].items[0];
    item2 = testData.folioInstances[0].items[1];

    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        effectiveSP = sp;
      });
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
        testData.mainLibraryLocationId = res.id;
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location: { id: testData.mainLibraryLocationId },
        });
      });
      cy.createTempUser([]).then((borrowerProps) => {
        testData.borrower = borrowerProps;
        UserEdit.addServicePointsViaApi([effectiveSP.id], testData.borrower.userId, effectiveSP.id);
        Checkout.checkoutItemViaApi({
          itemBarcode: item1.barcode,
          servicePointId: effectiveSP.id,
          userBarcode: testData.borrower.barcode,
        });
        Checkout.checkoutItemViaApi({
          itemBarcode: item2.barcode,
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
        [CapabilitySets.uiCheckin, CapabilitySets.uiInventoryInstanceView],
      );
      UserEdit.addServicePointsViaApi([effectiveSP.id], testData.user.userId, effectiveSP.id);
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.user) Users.deleteViaApi(testData.user.userId);
    if (testData.borrower) Users.deleteViaApi(testData.borrower.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: effectiveSP,
      shouldCheckIn: true,
    });
  });

  it(
    'C1602436 Log checked out items for in-house use during the check-in process (vega)',
    { tags: ['extendedPath', 'vega', 'C1602436'] },
    () => {
      // Step 1: Select service point from Preconditions — "In-house use" checkbox is displayed unchecked
      SwitchServicePoint.switchServicePoint(effectiveSP.name);
      SwitchServicePoint.checkIsServicePointSwitched(effectiveSP.name);
      CheckInActions.verifyInHouseUseCheckbox(false);

      // Step 2: Check "In-house use" checkbox — checkbox becomes checked
      CheckInActions.checkInHouseUseCheckbox();
      CheckInActions.verifyInHouseUseCheckbox(true);

      // Step 3: Check in Item 1 — "Confirm in-house use" popup appears with correct content
      CheckInActions.checkInItemGui(item1.barcode);
      InHouseUseConfirmModal.verifyModalContent();

      // Step 4: Click "Cancel" — popup is closed, item is not checked in, barcode field is cleared
      InHouseUseConfirmModal.clickCancel();
      InHouseUseConfirmModal.verifyModalAbsent();
      CheckInPane.checkItemIsNotCheckedIn(item1.barcode);
      CheckInActions.verifyBarcodeFieldIsEmpty();

      // Step 5: Check in Item 1, press Escape — popup is closed, item is not checked in, barcode cleared
      CheckInActions.checkInItemGui(item1.barcode);
      Modals.closeModalWithEscapeIfAny();
      InHouseUseConfirmModal.verifyModalAbsent();
      CheckInPane.checkItemIsNotCheckedIn(item1.barcode);
      CheckInActions.verifyBarcodeFieldIsEmpty();

      // Step 6: Check in Item 1, click "Check in only" — item checked in as Available,
      // checkbox remains checked, no in-house use icon, inHouseUse: false in request body.
      // The intercept is set up AFTER the modal appears because scanning a checked-out item
      // fires an initial request (inHouseUse: true) that is rejected with
      // CHECKED_OUT_ITEM_IN_HOUSE_USE_REQUIRES_CONFIRMATION. The confirmation click sends
      // the second, decisive request — that is the one we want to assert on.
      CheckInActions.checkInItemGui(item1.barcode);
      InHouseUseConfirmModal.verifyModalContent();
      cy.intercept('POST', 'circulation/check-in-by-barcode').as('checkInOnly');
      InHouseUseConfirmModal.clickCheckInOnly();
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, item1.barcode]);
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(false, 0);
      cy.wait('@checkInOnly').its('request.body.inHouseUse').should('eq', false);
      CheckInActions.verifyBarcodeFieldIsEmpty();

      // Step 7: Open Item details from row 0 — verify circulation history with one Checked in record
      CheckInActions.openItemDetails(item1.barcode);
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemCirculationHistoryRow(
        {
          date: todayDate,
          circAction: 'Checked in',
          source: `${testData.user.lastName}, ${testData.user.firstName}`,
          servicePoint: effectiveSP.name,
        },
        0,
      );

      // Step 8: Navigate back to Check in, re-check "In-house use", check in Item 2 — popup appears
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.waitLoading();
      CheckInActions.verifyInHouseUseCheckbox(false);
      CheckInActions.checkInHouseUseCheckbox();
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInActions.checkInItemGui(item2.barcode);
      InHouseUseConfirmModal.verifyModalExists();

      // Step 9: Click X button — popup is closed, item is not checked in, barcode field is cleared
      InHouseUseConfirmModal.clickCloseIcon();
      InHouseUseConfirmModal.verifyModalAbsent();
      CheckInPane.verifyItemBarcodeAbsentInResults(item2.barcode);
      CheckInActions.verifyBarcodeFieldIsEmpty();

      // Step 10: Check in Item 2, click "Check in and in-house use" — item checked in as Available,
      // checkbox remains checked, two rows appear: row 0 WITH icon, row 1 WITHOUT icon, inHouseUse: true
      CheckInActions.checkInItemGui(item2.barcode);
      InHouseUseConfirmModal.verifyModalExists();
      cy.intercept('POST', 'circulation/check-in-by-barcode').as('checkInAndInHouseUse');
      InHouseUseConfirmModal.clickCheckInAndInHouseUse();
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, item2.barcode], 1);
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true, 0);
      CheckInPane.checkInHouseUseIcon(false, 1);
      cy.wait('@checkInAndInHouseUse').its('request.body.inHouseUse').should('eq', true);
      CheckInActions.verifyBarcodeFieldIsEmpty();

      // Step 11: Ellipsis on row WITH in-house use icon — action menu contains only "Item details"
      CheckInPane.clickActionsForRow(0);
      CheckInPane.verifyActionsMenuContainsOnlyItemDetails();
      cy.get('body').type('{esc}');

      // Step 12: Ellipsis on row WITHOUT in-house use icon — action menu contains all 4 options
      CheckInPane.clickActionsForRow(1);
      CheckInPane.verifyActionsMenuContainsCheckedOutOptions();

      // Step 13: Select "Item details" — verify circulation history with two records:
      // row 0: in-house use registration (Object: "In-house use", Circ action: "Recorded")
      // row 1: check-in record (Object: blank, Circ action: "Checked in")
      CheckInPane.clickItemDetailsFromOpenMenu();
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemCirculationHistoryRow(
        {
          date: todayDate,
          object: 'In-house use',
          circAction: 'Recorded',
          source: `${testData.user.lastName}, ${testData.user.firstName}`,
          servicePoint: effectiveSP.name,
        },
        0,
      );
      ItemRecordView.checkItemCirculationHistoryRow(
        {
          date: todayDate,
          circAction: 'Checked in',
          source: `${testData.user.lastName}, ${testData.user.firstName}`,
          servicePoint: effectiveSP.name,
        },
        1,
      );
    },
  );
});
