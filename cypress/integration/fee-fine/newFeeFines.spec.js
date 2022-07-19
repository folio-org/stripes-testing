import uuid from 'uuid';
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
import devTeams from '../../support/dictionary/devTeams';

describe('Fee/fine management', () => {
  const testData = {};
  beforeEach(() => {
    cy.getAdminToken();
    const patronGroupName = `autotestPatronGroup${getRandomPostfix()}`;
    PatronGroups.createViaApi(patronGroupName).then(patronGroupId => {
      testData.patronGroupId = patronGroupId;
      testData.userProperties = { barcode : uuid() };
      Users.createViaApi({ ...Users.defaultUser, patronGroup: patronGroupId, barcode: testData.userProperties.barcode }).then(userProperties => {
        testData.userProperties.id = userProperties.id;
        testData.userProperties.lastName = userProperties.lastName;
        testData.userProperties.firstName = userProperties.firstName;
        testData.userProperties.middleName = userProperties.middleName;
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
          .then((res) => {
            testData.servicePointId = res[0].id;
            UserEdit.addServicePointViaApi(testData.servicePointId, testData.userProperties.id);
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
            });
          });
      });
    });
  });

  it('C455 Verify "New fee/fine" behavior when "Charge & pay now" button pressed (spitfire)', { tags: [TestType.smoke, Features.feeFine, devTeams.firebird] }, () => {
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
    UsersCard.openFeeFines();
    UsersCard.startFeeFineAdding();
    NewFeeFine.waitLoading();
    initialCheckNewFeeFineFragment();
    pay(true, UsersCard.waitLoading, () => {
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
    });

    // Scenario 2: CHARGING MANUAL FEE/FINE USING BUTTON ON "FEES/FINES HISTORY"
    UsersCard.openFeeFines();
    UsersCard.viewAllFeesFines();
    UserAllFeesFines.createFeeFine();
    // TODO: double check current expectation "Fee/fine owner” as location of current staff member with option to be changed". "Select one" is presented now
    // initialCheckNewFeeFineFragment(testData.owner.name);
    initialCheckNewFeeFineFragment();
    pay(false, UserAllFeesFines.waitLoading, UserAllFeesFines.createFeeFine);
  });
  after(() => {
    PaymentMethods.deleteViaApi(testData.paymentMethod.id);
    ManualCharges.deleteViaApi(testData.feeFineType.id);
    UsersOwners.deleteViaApi(testData.owner.id);
    Users.deleteViaApi(testData.userProperties.id);
    PatronGroups.deleteViaApi(testData.patronGroupId);
  });
});
