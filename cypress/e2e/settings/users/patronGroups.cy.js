import uuid from 'uuid';
import TopMenu from '../../../support/fragments/topMenu';
import TestType from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Features from '../../../support/dictionary/features';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import Conditions from '../../../support/fragments/settings/users/conditions';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../../support/fragments/settings/users/manualCharges';
import UserCharge from '../../../support/fragments/users/userCharge';
import UsersCard from '../../../support/fragments/users/usersCard';
import Limits from '../../../support/fragments/settings/users/limits';
import UserAllFeesFines from '../../../support/fragments/users/userAllFeesFines';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Patron blocks relations with users, conditions', () => {
  const testData = {};
  it(
    "C11020 Verify user information display when automated patron block 'Maximum outstanding fee/fine balance' exists for patron (vega)",
    { tags: [TestType.smoke, Features.patronBlocks, DevTeams.vega] },
    () => {
      testData.chargeAmount = 100;

      cy.getAdminToken();
      const patronGroupName = `auttestPatronGroup${getRandomPostfix()}`;
      PatronGroups.createViaApi(patronGroupName).then((patronGroupId) => {
        testData.patronGroupId = patronGroupId;
        Users.createViaApi({ ...Users.defaultUser, patronGroup: patronGroupId }).then(
          (userProperties) => {
            testData.userId = userProperties.id;
            testData.username = userProperties.username;
            Conditions.getConditionsViaApi().then((patronBlockConditions) => {
              const testCondition =
                Conditions.defaultConditions.defaultMaximumOustandingFeeFineBalance;
              testData.testConditionId = patronBlockConditions.filter(
                (conditionProperty) => conditionProperty.name === testCondition.name,
              )[0].id;
              testData.name = testCondition.name;
              Conditions.updateViaApi({ ...testCondition, id: testData.testConditionId });
              Limits.createViaApi(
                patronGroupId,
                testData.testConditionId,
                testData.chargeAmount - 0.01,
              );

              UsersOwners.createViaApi({ owner: uuid() }).then(({ id, owner }) => {
                testData.ownerId = id;
                ManualCharges.createViaApi({
                  ...ManualCharges.defaultFeeFineType,
                  ownerId: id,
                  defaultAmount: testData.chargeAmount,
                }).then((manualCharge) => {
                  testData.manualChargeId = manualCharge.id;
                  cy.loginAsAdmin();
                  cy.visit(TopMenu.usersPath);
                  UsersSearchPane.searchByLastName(testData.username);
                  UsersCard.startFeeFine();
                  UserCharge.fillRequiredFields(owner, manualCharge.feeFineType);
                  UserCharge.chargeOnly();
                  // TODO: clarify the issue when error message is not presented in cypress env time to time
                  UsersCard.hasSaveError(UsersCard.errors.patronHasBlocksInPlace);
                });
              });
            });
          },
        );
      });
    },
  );
  after(() => {
    UserAllFeesFines.waiveFeeFine(testData.userId, testData.chargeAmount, testData.ownerId);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    UsersOwners.deleteViaApi(testData.ownerId);
    Conditions.resetConditionViaApi(testData.testConditionId, testData.name);
    Users.deleteViaApi(testData.userId);
    PatronGroups.deleteViaApi(testData.patronGroupId);
  });
});
