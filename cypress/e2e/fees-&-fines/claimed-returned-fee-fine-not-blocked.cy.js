import moment from 'moment/moment';
import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import ConfirmClaimReturnedModal from '../../support/fragments/users/loans/confirmClaimReturnedModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../support/utils/stringTools';
import feeFines from '../../support/fragments/users/feeFines';

describe('Fees&Fines', () => {
  describe('Claimed Returned Fee/Fine Actions', () => {
    const testData = {
      ownerData: {},
      itemBarcode: generateItemBarcode(),
      instanceTitle: getTestEntityValue('Instance'),
    };
    const feeFineType = {};
    const paymentMethod = {};
    const patronGroup = {
      name: 'groupClaimedReturned' + getTestEntityValue(),
    };
    let userA;
    let userB;
    let feeFineAccount;
    let defaultLocation;
    let servicePoint;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          ServicePoints.getCircDesk1ServicePointViaApi();
        })
        .then((circDesk1) => {
          servicePoint = circDesk1;
          defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(defaultLocation);

          PatronGroups.createViaApi(patronGroup.name);
        })
        .then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;

          cy.createTempUser([], patronGroup.name);
        })
        .then((userProperties) => {
          userA = userProperties;
          UserEdit.addServicePointViaApi(servicePoint.id, userA.userId);
          cy.createTempUser([], patronGroup.name);
        })
        .then((userProperties) => {
          userB = userProperties;
          UserEdit.addServicePointViaApi(servicePoint.id, userB.userId);

          UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner());
        })
        .then(({ id, owner }) => {
          testData.ownerData.name = owner;
          testData.ownerData.id = id;

          UsersOwners.addServicePointsViaApi(testData.ownerData, [servicePoint]);
          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: testData.ownerData.id,
          });
        })
        .then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;

          PaymentMethods.createViaApi(testData.ownerData.id);
        })
        .then(({ name, id }) => {
          paymentMethod.name = name;
          paymentMethod.id = id;

          cy.getInstanceTypes({ limit: 1 });
        })
        .then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
          cy.getHoldingTypes({ limit: 1 });
        })
        .then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
          cy.getLoanTypes({ limit: 1 });
        })
        .then((res) => {
          testData.loanTypeId = res[0].id;
          cy.getDefaultMaterialType();
        })
        .then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;

          InventoryInstances.getInstancesViaApi({ limit: 1 });
        })
        .then((instances) => {
          const existingInstance = instances[0];
          testData.instanceData = {
            instanceId: existingInstance.id,
            instanceTitle: existingInstance.title,
          };

          return InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: existingInstance.id,
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: defaultLocation.id,
                sourceId: folioSource.id,
              });
            })
            .then((holdingData) => {
              testData.holdingId = holdingData.id;
              cy.createItem({
                holdingsRecordId: holdingData.id,
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              });
            });
        })
        .then(() => {
          return cy.getAdminSourceRecord();
        })
        .then((adminSourceRecord) => {
          feeFineAccount = {
            id: uuid(),
            ownerId: testData.ownerData.id,
            feeFineId: feeFineType.id,
            amount: 40,
            userId: userA.userId,
            feeFineType: feeFineType.name,
            feeFineOwner: testData.ownerData.name,
            createdAt: servicePoint.id,
            dateAction: moment.utc().format(),
            source: adminSourceRecord,
          };
          NewFeeFine.createViaApi(feeFineAccount);
        })
        .then((feeFineAccountId) => {
          feeFineAccount.id = feeFineAccountId;

          cy.createTempUser([
            Permissions.checkinAll.gui,
            Permissions.checkoutAll.gui,
            Permissions.loansAll.gui,
            Permissions.checkoutCirculatingItems.gui,
            Permissions.uiUsersfeefinesView.gui,
            Permissions.uiUsersLoansClaimReturned.gui,
            Permissions.uiUsersfeefinesCRUD.gui,
            Permissions.uiUsersManualPay.gui,
          ]);
        })
        .then((userProperties) => {
          testData.adminUser = userProperties;
          UserEdit.addServicePointViaApi(
            servicePoint.id,
            testData.adminUser.userId,
            servicePoint.id,
          );
          cy.waitForAuthRefresh(() => {
            cy.login(testData.adminUser.username, testData.adminUser.password, {
              path: TopMenu.checkInPath,
              waiter: CheckInActions.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.itemBarcode,
        claimedReturnedResolution: 'Returned by patron',
        servicePointId: servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      ManualCharges.deleteViaApi(feeFineType.id);
      PaymentMethods.deleteViaApi(paymentMethod.id);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      UsersOwners.deleteViaApi(testData.ownerData.id);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      PatronGroups.deleteViaApi(patronGroup.id);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        defaultLocation.institutionId,
        defaultLocation.campusId,
        defaultLocation.libraryId,
        defaultLocation.id,
      );
    });

    it(
      'C491280 Check that Fee/fine from previous loan is NOT blocked from actions when item is checked out again and claimed returned (vega)',
      { tags: ['extendedPath', 'vega', 'C491280'] },
      () => {
        // Step 1: Check in Item from preconditions
        CheckInActions.checkInItemGui(testData.itemBarcode);
        CheckInActions.verifyLastCheckInItem(testData.itemBarcode);

        // Step 2: Check out Item from preconditions to User B
        cy.visit(TopMenu.checkOutPath);
        Checkout.waitLoading();
        CheckOutActions.checkOutUser(userB.barcode);
        CheckOutActions.checkOutItem(testData.itemBarcode);
        CheckOutActions.checkItemInfo(testData.itemBarcode, testData.instanceData.instanceTitle);

        // Step 3: Go to loan details and make Item claimed returned
        CheckOutActions.openLoanDetails();
        UserLoans.verifyClaimReturnedButtonIsVisible();
        UserLoans.openClaimReturnedPane();
        ConfirmClaimReturnedModal.confirmClaimReturnedInLoanDetails();
        cy.wait(2000);

        // Step 4: Go to "Fee/fine details" page of User A
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByKeywords(userA.username);
        UsersSearchPane.selectUserFromList(userA.username);
        UsersCard.waitLoading();
        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        feeFines.openFeeFine();

        // Step 5: Click on "Actions" button - verify all actions are available
        FeeFinesDetails.openActions();
        FeeFinesDetails.verifyActionsAreAvailable(['Pay', 'Waive', 'Transfer', 'Error', 'Export']);

        // Step 6: Click on "Pay" action (verifies that Pay action is available)
        FeeFinesDetails.openPayModal();
        PayFeeFine.waitLoading();

        // Step 7: Select payment method and click on "Pay" button
        PayFeeFine.setPaymentMethod(paymentMethod);

        // Step 8: Click on "Confirm" button and verify success message
        PayFeeFine.submitAndConfirm();
        FeeFinesDetails.checkFeeFineLatestPaymentStatus('Paid fully');
      },
    );
  });
});
