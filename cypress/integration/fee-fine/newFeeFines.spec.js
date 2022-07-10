import uuid from 'uuid';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import topMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import AppPaths from '../../support/fragments/app-paths';
import UsersCard from '../../support/fragments/users/usersCard';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import DefaultUser from '../../support/fragments/users/userDefaultObjects/defaultUser';

describe('Fee/fine management', () => {
  const testData = {
    instanceTitle: `Pre-checkin_instance_${Number(new Date())}`
  };
  const ITEM_BARCODE = generateItemBarcode();
  const userData = { ...DefaultUser.defaultApiPatron };
  const patronGroup = {};
  const patronGroupName = `autotestPatronGroup${getRandomPostfix()}`;

  beforeEach(() => {
    cy.getAdminToken();
    PatronGroups.createViaApi(patronGroupName).then(patronGroupId => {
      testData.patronGroupId = patronGroupId;
      testData.userProperties = { barcode : uuid() };
      Users.createViaApi({
        patronGroup: patronGroupId,
        ...userData
      }).then(userProperties => {
        testData.userProperties.id = userProperties.id;
        testData.userProperties.lastName = userProperties.lastName;
        testData.userProperties.firstName = userProperties.firstName;
        testData.userProperties.middleName = userProperties.middleName;
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
          .then((response) => {
            testData.servicePointId = response[0].id;
            UserEdit.addServicePointViaApi(testData.servicePointId, testData.userProperties.id);
            cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialType = res.id; });
            cy.getLocations({ limit: 1 }).then((res) => { testData.location = res.id; });
            cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingType = res[0].id; });
            InventoryHoldings.getHoldingSources({ limit: 1 }).then((res) => { testData.holdingSource = res[0].id; });
            cy.getInstanceTypes({ limit: 1 }).then((res) => { testData.instanceType = res[0].id; });
            cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanType = res[0].id; });
            UsersOwners.createViaApi({ owner: uuid() }).then(owner => {
              testData.owner = { id : owner.id, name : owner.ownerName };
              ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId: owner.id }).then(manualCharge => {
                testData.feeFineType = { id:  manualCharge.id, feeFineTypeName: manualCharge.feeFineType };
                PaymentMethods.createViaApi(testData.owner.id).then(createdPaymentMethod => {
                  testData.paymentMethod = { id: createdPaymentMethod.id, name: createdPaymentMethod.name };
                  // TODO: clarify why initial login is needed to load accordion with Fee/Fines
                  // cy.loginAsAdmin({ path: AppPaths.getUserPreviewPath(testData.userId), waiter: UsersCard.waitLoading });
                  cy.loginAsAdmin();
                  cy.visit(AppPaths.getUserPreviewPath(testData.userProperties.id));
                  UsersCard.waitLoading();
                });
              });
              cy.createInstance({
                instance: {
                  instanceTypeId: testData.instanceType,
                  title: testData.instanceTitle,
                },
                holdings: [{
                  holdingsTypeId: testData.holdingType,
                  permanentLocationId: testData.location,
                  sourceId: testData.holdingSource,
                }],
                items: [
                  [{
                    barcode: ITEM_BARCODE,
                    missingPieces: '3',
                    numberOfMissingPieces: '3',
                    status: { name: 'Available' },
                    permanentLoanType: { id: testData.loanType },
                    materialType: { id: testData.materialType },
                  }],
                ],
              });
            });
          });
      });
    });
  });

  it('C455 Verify "New fee/fine" behavior when "Charge & pay now" button pressed', { tags: [TestType.smoke, Features.feeFine] }, () => {
    const initialCheckNewFeeFineFragment = (ownerName = '') => {
      NewFeeFine.checkInitialState(testData.userProperties, ownerName);
      NewFeeFine.setFeeFineOwner(testData.owner.name);
      NewFeeFine.checkFilteredFeeFineType(testData.feeFineType.feeFineTypeName);
    };

    const pay = (isFullPay = true, initialFragmentWaiter, secondOpen) => {
      NewFeeFine.setFeeFineType(testData.feeFineType.feeFineTypeName);
      NewFeeFine.checkAmount(ManualCharges.defaultFeeFineType.defaultAmount);
      // TODO: can't see expected warning "Are you sure?"
      NewFeeFine.cancel();
      initialFragmentWaiter();
      secondOpen();
      NewFeeFine.setFeeFineOwner(testData.owner.name);
      NewFeeFine.setFeeFineType(testData.feeFineType.feeFineTypeName);
      NewFeeFine.chargeAndPayNow();
      PayFeeFaine.checkAmount(ManualCharges.defaultFeeFineType.defaultAmount);
      PayFeeFaine.setPaymentMethod(testData.paymentMethod);
      if (!isFullPay) {
        PayFeeFaine.setAmount(ManualCharges.defaultFeeFineType.defaultAmount - 1);
        PayFeeFaine.checkRestOfPay(1);
      }
      PayFeeFaine.submit();
      if (!isFullPay) {
        PayFeeFaine.checkPartialPayConfirmation();
        PayFeeFaine.back();
        PayFeeFaine.setPaymentMethod(testData.paymentMethod);
        PayFeeFaine.setAmount(ManualCharges.defaultFeeFineType.defaultAmount);
        PayFeeFaine.checkRestOfPay(0);
        PayFeeFaine.submit();
      }
      PayFeeFaine.confirm();
      initialFragmentWaiter();
    };


    // Scenario 1: CHARGING MANUAL FEE/FINE USING BUTTON FROM USER INFORMATION
    // UsersCard.openFeeFines();
    // UsersCard.startFeeFineAdding();
    // NewFeeFine.waitLoading();
    // initialCheckNewFeeFineFragment();
    // pay(true, UsersCard.waitLoading, () => {
    //   UsersCard.openFeeFines();
    //   UsersCard.startFeeFineAdding();
    // });

    // Scenario 2: CHARGING MANUAL FEE/FINE USING BUTTON ON "FEES/FINES HISTORY"
    // UsersCard.openFeeFines();
    // UsersCard.viewAllFeesFines();
    // UserAllFeesFines.createFeeFine();
    // // TODO: double check current expectation "Fee/fine owner” as location of current staff member with option to be changed". "Select one" is presented now
    // // initialCheckNewFeeFineFragment(testData.owner.name);
    // initialCheckNewFeeFineFragment();
    // pay(false, UserAllFeesFines.waitLoading, UserAllFeesFines.createFeeFine);

    // Scenario 3: CHARGING MANUAL FEE/FINES USING ELLIPSIS OPTION FROM OPEN/CLOSED LOANS
    // 1) Go to Users app and select a test patron.
    // UsersCard.openFeeFines();
    // 2) Go to Checkout app and check out an item to this test patron.
    // cy.visit(topMenu.checkOutPath);
    // CheckOutActions.checkOutUser(userData.barcode);
    // CheckOutActions.checkUserInfo(userData, patronGroupName);
    // CheckOutActions.checkOutUser(userData.barcode);
    // CheckOutActions.checkOutItem(ITEM_BARCODE);
    // MultipieceCheckOut.confirmMultipleCheckOut(ITEM_BARCODE);
    // CheckOutActions.checkUserInfo(userData);
    // CheckOutActions.checkItemInfo(ITEM_BARCODE, testData.instanceTitle);
    // CheckOutActions.endSession();
    // 3) On the "User Details" page, expand the "Loans" accordion.
    // 4) Click on "Open loans" link.
    UsersCard.openLoans();
    // 5) "Loans" page opens.
    // 6) Click ellipsis in ACTIONS column, then select "New fee/fine"
    UsersCard.openFeeFines();
    cy.get('button').contains('Actions').click();
  });
  after(() => {
    PaymentMethods.deleteViaApi(testData.paymentMethod.id);
    ManualCharges.deleteViaApi(testData.feeFineType.id);
    UsersOwners.deleteViaApi(testData.owner.id);
    Users.deleteViaApi(testData.userProperties.id);
    PatronGroups.deleteViaApi(testData.patronGroupId);

    // cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
    //   .then((instance) => {
    //     cy.deleteItem(instance.items[0].id);
    //     cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
    //     InventoryInstance.deleteInstanceViaApi(instance.id);
    //   });
  });
});
