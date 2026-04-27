import uuid from 'uuid';
import Conditions from '../../../../../../support/fragments/settings/users/conditions';
import Limits from '../../../../../../support/fragments/settings/users/limits';
import ManualCharges from '../../../../../../support/fragments/settings/users/manualCharges';
import PatronGroups from '../../../../../../support/fragments/settings/users/patronGroups';
import UsersOwners from '../../../../../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../../../../../support/fragments/topMenu';
import UserAllFeesFines from '../../../../../../support/fragments/users/userAllFeesFines';
import UserCharge from '../../../../../../support/fragments/users/userCharge';
import Users from '../../../../../../support/fragments/users/users';
import UsersCard from '../../../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../../../support/utils/users';

describe('Fees&Fines', () => {
  describe('Automated Patron Blocks', () => {
    const testData = {};
    const { user, memberTenant } = parseSanityParameters();
    it(
      'C11020 Verify user information display when automated patron block "Maximum outstanding fee/fine balance" exists for patron (vega)',
      { tags: ['dryRun', 'vega', 'C11020'] },
      () => {
        testData.chargeAmount = 100;
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false });
        const patronGroupName = `autotestPatronGroup${getRandomPostfix()}`;
        PatronGroups.createViaApi(patronGroupName).then((patronGroupId) => {
          testData.patronGroupId = patronGroupId;
          Users.createViaApi({ ...Users.defaultUser, patronGroup: patronGroupId }).then(
            (userProperties) => {
              testData.userId = userProperties.id;
              testData.username = userProperties.username;
              Conditions.getConditionsViaApi().then((patronBlockConditions) => {
                const testCondition =
                  Conditions.defaultConditions.defaultMaximumOutstandingFeeFineBalance;
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

                    cy.waitForAuthRefresh(() => {
                      cy.login(user.username, user.password, {
                        path: TopMenu.usersPath,
                        waiter: UsersSearchPane.waitLoading,
                      });
                    });
                    UsersSearchPane.searchByLastName(testData.username);
                    UsersCard.startFeeFine();
                    UserCharge.fillRequiredFields(owner, manualCharge.feeFineType);
                    UserCharge.chargeOnly();
                    Users.waitForAutomatedPatronBlocksForUser(testData.userId, 4 * 60);
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
      cy.getUserToken(user.username, user.password, { log: false });
      UserAllFeesFines.waiveFeeFine(testData.userId, testData.chargeAmount, testData.ownerId);
      ManualCharges.deleteViaApi(testData.manualChargeId);
      UsersOwners.deleteViaApi(testData.ownerId);
      Conditions.resetConditionViaApi(testData.name);
      Users.deleteViaApi(testData.userId);
      PatronGroups.deleteViaApi(testData.patronGroupId);
    });
  });
});
