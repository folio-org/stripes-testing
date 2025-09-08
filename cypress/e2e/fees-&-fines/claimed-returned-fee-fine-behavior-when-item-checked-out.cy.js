import uuid from 'uuid';

import ConfirmClaimReturnedModal from '../../support/fragments/users/loans/confirmClaimReturnedModal';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { ServicePoints } from '../../support/fragments/settings/tenant';
import { Permissions } from '../../support/dictionary';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import AppPaths from '../../support/fragments/app-paths';
import Users from '../../support/fragments/users/users';

describe('Fees&Fines', () => {
  describe('Claimed Returned', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const itemBarcode = testData.folioInstances[0].barcodes[0];
    const userOwnerBody = {
      id: uuid(),
      owner: getTestEntityValue('OwnerCircLog'),
      servicePointOwner: [
        {
          value: testData.servicePoint.id,
          label: testData.servicePoint.name,
        },
      ],
    };

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      UsersOwners.createViaApi(userOwnerBody);
      ManualCharges.createViaApi({
        ...ManualCharges.defaultFeeFineType,
        ownerId: userOwnerBody.id,
      }).then((chargeRes) => {
        testData.manualChargeId = chargeRes.id;
        testData.manualChargeName = chargeRes.feeFineType;
      });
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      cy.createTempUser([
        Permissions.uiUsersfeefinesView.gui,
        Permissions.uiUsersLoansClaimReturned.gui,
        Permissions.uiUsersDeclareItemLost.gui,
        Permissions.uiUsersView.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user.userId,
            testData.servicePoint.id,
          );
          Checkout.checkoutItemViaApi({
            itemBarcode,
            userBarcode: testData.user.barcode,
            servicePointId: testData.servicePoint.id,
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: AppPaths.getUserPreviewPathWithQuery(testData.user.userId),
            waiter: UsersCard.waitLoading,
          });
        });
    });

    after('Create test data', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      Locations.deleteViaApi(testData.defaultLocation);
      ManualCharges.deleteViaApi(testData.manualChargeId);
      UsersOwners.deleteViaApi(userOwnerBody.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C367982 Check that "Confirm" button on "Confirm item status: Claimed returned" modal became disabled after clicking on it (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C367982'] },
      () => {
        const declareLostComments = getTestEntityValue('Some additional information');

        UsersCard.clickOnCloseIcon();
        cy.waitForAuthRefresh(() => {
          cy.reload();
        }, 20_000);
        // Expand "Loans" accordion by clicking on it and Click on "Open loans" button

        UsersCard.viewCurrentLoans({ openLoans: testData.folioInstances.length });
        UserLoans.checkResultsInTheRowByBarcode([ITEM_STATUS_NAMES.CHECKED_OUT], itemBarcode);
        // Click on the row with the loan matching the preconditions
        UserLoans.openLoanDetails(itemBarcode);
        LoanDetails.checkAction(0, ITEM_STATUS_NAMES.CHECKED_OUT);
        // Click on "Declared lost" button
        LoanDetails.startDeclareLost();
        // Fill "Add Additional information" field and click "Confirm" button
        LoanDetails.finishDeclareLost(declareLostComments);
        LoanDetails.checkAction(0, ITEM_STATUS_NAMES.DECLARED_LOST);
        // Click on "Claimed return" button
        UserLoans.openClaimReturnedPane(itemBarcode);
        // Fill "Add Additional information" field and click "Confirm" button
        ConfirmClaimReturnedModal.confirmClaimReturnedInLoanDetails();
        LoanDetails.checkAction(0, ITEM_STATUS_NAMES.CLAIMED_RETURNED);
      },
    );
  });
});
