import uuid from 'uuid';
import TestType from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import Conditions from '../../../support/fragments/settings/users/conditions';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../../support/fragments/settings/users/manualCharges';
import AppPaths from '../../../support/fragments/app-paths';
import UserCharge from '../../../support/fragments/users/userCharge';
import UsersCard from '../../../support/fragments/users/usersCard';
import Limits from '../../../support/fragments/settings/users/limits';
import UserAllFeesFines from '../../../support/fragments/users/userAllFeesFines';

describe('Patron blocks relations with users, conditions', () => {
  const testData = {};
  it("C11020 Verify user information display when automated patron block 'Maximum outstanding fee/fine balance' exists for patron (prokopovych)",
    { tags: [TestType.smoke, Features.patronBlocks, TestType.broken] }, () => {
      testData.chargeAmount = 100;

      cy.getAdminToken();
      const patronGroupName = `auttestPatronGroup${getRandomPostfix()}`;
      PatronGroups.createViaApi(patronGroupName).then(patronGroupId => {
        testData.patronGroupId = patronGroupId;
        Users.createViaApi({ ...Users.defaultUser, patronGroup: patronGroupId }).then(userProperties => {
          testData.userId = userProperties.id;
          testData.username = userProperties.username;

          Conditions.getConditionsViaApi().then(patronBlockConditions => {
            const testCondition = Conditions.defaultConditions.defaultMaximumOustandingFeeFineBalance;
            testData.testConditionId = patronBlockConditions.filter(conditionProperty => conditionProperty.name === testCondition.name)[0].id;
            testData.name = testCondition.name;
            Conditions.updateViaApi({ ...testCondition, id: testData.testConditionId });
            Limits.createViaApi(patronGroupId, testData.testConditionId, testData.chargeAmount - 0.01);

            UsersOwners.createViaApi({ owner: uuid() }).then(owner => {
              testData.ownerId = owner.id;
              ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId: owner.id, defaultAmount: testData.chargeAmount }).then(manualCharge => {
                testData.manualChargeId = manualCharge.id;
                cy.loginAsAdmin({ path: AppPaths.getUserPreviewPath(userProperties.id), waiter: UsersCard.waitLoading });
                // TODO: clarify the reason of extra reloading
                cy.reload();
                UsersCard.startFeeFine();
                UserCharge.fillRequiredFields(owner.ownerName, manualCharge.feeFineType);
                UserCharge.chargeOnly();
                // TODO: clarify the issue when error message is not presented in cypress env time to time
                UsersCard.hasSaveError(UsersCard.errors.patronHasBlocksInPlace);
              });
            });
          });
        });
      });
    });
  after(() => {
    UserAllFeesFines.waiveFeeFine(testData.userId, testData.chargeAmount, testData.ownerId);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    UsersOwners.deleteViaApi(testData.ownerId);
    Conditions.resetConditionViaApi(testData.testConditionId, testData.name);
    Users.deleteViaApi(testData.userId);
    PatronGroups.deleteViaApi(testData.patronGroupId);
  });
});
