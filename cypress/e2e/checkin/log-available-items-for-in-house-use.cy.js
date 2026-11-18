import CapabilitySets from '../../support/dictionary/capabilitySets';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import InTransit from '../../support/fragments/checkin/modals/inTransit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SwitchServicePoint from '../../support/fragments/settings/tenant/servicePoints/switchServicePoint';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../support/constants';

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
    });
    cy.createTempUser([]).then((createdUserProperties) => {
      testData.user = createdUserProperties;
      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiCheckin, CapabilitySets.uiCheckout],
      );
      UserEdit.addServicePointsViaApi(
        [effectiveSP.id, differentSP.id],
        testData.user.userId,
        effectiveSP.id,
      );
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.user) Users.deleteViaApi(testData.user.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: effectiveSP,
      shouldCheckIn: true,
    });
  });

  it(
    'C1602433 Log available items for in-house use during the check-in process (vega)',
    { tags: ['criticalPath', 'vega', 'C1602433'] },
    () => {
      cy.intercept('POST', 'circulation/check-in-by-barcode').as('checkIn');

      // Step 1: Select service point different from effective location SP — "In-house use" checkbox is displayed unchecked
      SwitchServicePoint.switchServicePoint(differentSP.name);
      SwitchServicePoint.checkIsServicePointSwitched(differentSP.name);
      CheckInActions.verifyInHouseUseCheckbox(false);

      // Step 2: Check "In-house use" checkbox — checkbox becomes checked
      CheckInActions.checkInHouseUseCheckbox();
      CheckInActions.verifyInHouseUseCheckbox(true);

      // Step 3: Check in Item 1 — "In transit" popup appears
      CheckInActions.checkInItemGui(item1.barcode);
      InTransit.verifyModalTitle();

      // Step 4: Close "In transit" popup — checkbox remains checked, in-house use icon appears, inHouseUse: true
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', true);

      // Step 5: Check in Item 2 — "In transit" popup appears
      CheckInActions.checkInItemGui(item2.barcode);
      InTransit.verifyModalTitle();

      // Step 6: Close "In transit" popup — checkbox remains checked, in-house use icon appears, inHouseUse: true
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', true);

      // Step 7: Check in Item 3 — "In transit" popup appears
      CheckInActions.checkInItemGui(item3.barcode);
      InTransit.verifyModalTitle();

      // Step 8: Close "In transit" popup — checkbox remains checked, in-house use icon appears, inHouseUse: true
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', true);

      // Step 9: Navigate to Check out and back to Check in — "In-house use" checkbox becomes unchecked
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.verifyInHouseUseCheckbox(false);

      // Step 10: Check in Item 1 — "In transit" popup appears
      CheckInActions.checkInItemGui(item1.barcode);
      InTransit.verifyModalTitle();

      // Step 11: Close "In transit" popup — checkbox remains unchecked, no in-house use icon, inHouseUse: false
      InTransit.unselectCheckboxPrintSlip();
      InTransit.closeModal();
      CheckInActions.verifyInHouseUseCheckbox(false);
      CheckInPane.checkInHouseUseIcon(false);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', false);

      // Step 12: Switch to effective service point, check in Item 2 — available, inHouseUse: false, no icon
      SwitchServicePoint.switchServicePoint(effectiveSP.name);
      SwitchServicePoint.checkIsServicePointSwitched(effectiveSP.name);
      CheckInActions.checkInItemGui(item2.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, item2.barcode]);
      CheckInActions.verifyInHouseUseCheckbox(false);
      CheckInPane.checkInHouseUseIcon(false);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', false);

      // Step 13: Check in Item 2 again — available, inHouseUse: false, in-house use icon appears
      CheckInActions.checkInItemGui(item2.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, item2.barcode]);
      CheckInActions.verifyInHouseUseCheckbox(false);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', false);

      // Step 14: Navigate to Check out and back to Check in — "In-house use" checkbox remains unchecked
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
      CheckInActions.verifyInHouseUseCheckbox(false);

      // Step 15: Check "In-house use" checkbox — checkbox becomes checked
      CheckInActions.checkInHouseUseCheckbox();
      CheckInActions.verifyInHouseUseCheckbox(true);

      // Step 16: Check in Item 3 — available, inHouseUse: true, icon appears, checkbox remains checked
      CheckInActions.checkInItemGui(item3.barcode);
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, item3.barcode]);
      CheckInActions.verifyInHouseUseCheckbox(true);
      CheckInPane.checkInHouseUseIcon(true);
      cy.wait('@checkIn').its('request.body.inHouseUse').should('eq', true);

      // Step 17: Select newly created row — verify aria-label "In-house use, Yes"
      CheckInPane.verifyInHouseUseAriaLabel();
    },
  );
});
