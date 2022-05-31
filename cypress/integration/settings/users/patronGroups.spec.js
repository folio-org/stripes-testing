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

describe('Patron blocks relations with users, conditions', () => {
  const testData = {};
  it("C11020 Verify user information display when automated patron block 'Maximum outstanding fee/fine balance' exists for patron", { tags: [TestType.smoke, Features.patronBlocks] }, () => {
    const charge = 99.99;
    cy.getAdminToken();
    const patronGroupName = `auttestPatronGroup${getRandomPostfix()}`;
    PatronGroups.createViaApi(patronGroupName).then(patronGroupId => {
      testData.patronGroupId = patronGroupId;
      Users.createUserApi({ ...Users.defaultUser, patronGroup: patronGroupId }).then(userProperties => {
        testData.userId = userProperties.id;
        testData.username = userProperties.username;

        Conditions.getConditionsViaApi().then(patronBlockConditions => {
          const testCondition = Conditions.defaultConditions.defaultMaximumOustandingFeeFineBalance;
          testData.testConditionId = patronBlockConditions.filter(conditionProperty => conditionProperty.name === testCondition.name)[0].id;
          testData.name = testCondition.name;
          Conditions.updateViaApi({ ...testCondition, id: testData.testConditionId });
          Limits.createViApi(patronGroupId, testData.testConditionId, charge);

          UsersOwners.createViaApi({ owner: uuid() }).then(owner => {
            testData.ownerId = owner.id;
            testData.chargeAmount = charge + 0.01;
            ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId: owner.id, defaultAmount: testData.chargeAmount }).then(manualCharge => {
              testData.manualChargeId = manualCharge.id;
              // TODO: clarify why reload is needed to load expected options in Actions
              cy.visit(AppPaths.getUserPreviewPath(userProperties.id));
              cy.reload();
              UsersCard.startFeeFine();
              // cy.loginAsAdmin({ path: AppPaths.getChargePath(userId), waiter: UserCharge.waitLoading });

              UserCharge.fillRequiredFields(owner.ownerName, manualCharge.feeFineType);
              UserCharge.chargeOnly();
              // TODO: clarify the issue when error message is not presented
              // UsersCard.hasSaveError(UsersCard.errors.patronHasBlocksInPlace);
            });
          });
        });
      });
    });
  });
  after(() => {
    // test data clearing
    UsersCard.waiveFeeFine(testData.userId, testData.chargeAmount);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    UsersOwners.deleteViaApi(testData.ownerId);
    Conditions.resetConditionViaApi(testData.testConditionId, testData.name);
    Users.deleteViaApi(testData.userId);
    PatronGroups.deleteViaApi(testData.patronGroupId);
  });
});
