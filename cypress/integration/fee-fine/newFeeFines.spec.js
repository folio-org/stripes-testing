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
import userFeesFines from '../../support/fragments/users/userFeesFines';

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
                  testData.paymentMethodId = createdPaymentMethod.id;
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

  it('C455 Verify "New fee/fine" behavior when "Charge & pay now" button pressed', { tags: [TestType.smoke, Features.feeFine] }, () => {
    const initialCheckNewFeeFineFragment = (ownerName = '') => {
      NewFeeFine.checkInitialState(testData.userProperties, ownerName);
      NewFeeFine.setFeeFineOwner(testData.owner.name);
      NewFeeFine.checkFilteredOptions(testData.feeFineType.feeFineTypeName);
    };

    // Scenario 1: CHARGING MANUAL FEE/FINE USING BUTTON FROM USER INFORMATION
    UsersCard.openFeeFines();
    UsersCard.startFeeFineAdding();
    NewFeeFine.waitLoading();
    initialCheckNewFeeFineFragment();

    // return to UsersCard
    NewFeeFine.close();
    UsersCard.waitLoading();

    // Scenario 2: CHARGING MANUAL FEE/FINE USING BUTTON ON "FEES/FINES HISTORY"
    UsersCard.openFeeFines();
    UsersCard.viewAllFeesFines();
    userFeesFines.createFeeFine();
    // TODO: double check current expectation "Fee/fine owner” as location of current staff member with option to be changed". "Select one" is presented now
    // initialCheckNewFeeFineFragment(testData.owner.name);
    initialCheckNewFeeFineFragment();
  });
  after(() => {
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    ManualCharges.deleteViaApi(testData.feeFineType.id);
    UsersOwners.deleteViaApi(testData.owner.id);
    Users.deleteViaApi(testData.userProperties.id);
    PatronGroups.deleteViaApi(testData.patronGroupId);
  });
});
