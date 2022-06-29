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

describe('Fee/fine management', () => {
  const testData = {};
  beforeEach(() => {
    cy.getAdminToken();
    const patronGroupName = `autotestPatronGroup${getRandomPostfix()}`;
    PatronGroups.createViaApi(patronGroupName).then(patronGroupId => {
      testData.patronGroupId = patronGroupId;
      Users.createViaApi({ ...Users.defaultUser, patronGroup: patronGroupId }).then(userProperties => {
        testData.userId = userProperties.id;
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
          .then((res) => {
            testData.servicePointId = res[0].id;
            console.log(testData.userId);
            UserEdit.addServicePointViaApi(testData.servicePointId, testData.userId);
            UsersOwners.createViaApi({ owner: uuid() }).then(owner => {
              testData.ownerId = owner.id;
              ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId: owner.id }).then(manualCharge => {
                testData.manualChargeId = manualCharge.id;
                PaymentMethods.createViaApi(testData.ownerId).then(createdPaymentMethod => {
                  testData.paymentMethodId = createdPaymentMethod.id;
                  // TODO: clarify why initial login is needed to load accordion with Fee/Fines
                  // cy.loginAsAdmin({ path: AppPaths.getUserPreviewPath(testData.userId), waiter: UsersCard.waitLoading });
                  cy.loginAsAdmin();
                  cy.visit(AppPaths.getUserPreviewPath(testData.userId));
                  UsersCard.waitLoading();

                  cy.pause();
                });
              });
            });
          });
      });
    });
  });
  it('C455 Verify "New fee/fine" behavior when "Charge & pay now" button pressed', { tags: [TestType.smoke, Features.feeFine] }, () => {
    // Scenario 1: CHARGING MANUAL FEE/FINE USING BUTTON FROM USER INFORMATION
    UsersCard.openFeeFines();
    UsersCard.startFeeFineAdding();
    NewFeeFine.waitLoading();
  });
  after(() => {
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    UsersOwners.deleteViaApi(testData.ownerId);
    Users.deleteViaApi(testData.userId);
    PatronGroups.deleteViaApi(testData.patronGroupId);
  });
});
