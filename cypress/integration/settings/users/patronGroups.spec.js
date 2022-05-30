import TestType from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import Conditions from '../../../support/fragments/settings/users/conditions';

describe('Patron blocks relations with users, conditions', () => {
  it("C11020 Verify user information display when automated patron block 'Maximum outstanding fee/fine balance' exists for patron", { tags: [TestType.smoke, Features.patronBlocks] }, () => {
    cy.getAdminToken();

    const patronGroupName = `auttestPatronGroup${getRandomPostfix()}`;
    PatronGroups.createViaApi(patronGroupName).then(patronGroupId => {
      Users.createUserApi({ ...Users.defaultUser, patronGroup: patronGroupId }).then(userId => {
        Conditions.getConditionsViaApi().then(patronBlockConditions => {
          const testCondition = Conditions.defaultConditions.defaultMaximumOustandingFeeFineBalance;
          const testConditionId = patronBlockConditions.filter(conditionProperty => conditionProperty.name === testCondition.name)[0].id;
          Conditions.updateViaApi({ ...testCondition, id: testConditionId });



          // test data clearing
          Conditions.resetConditionViaApi(testConditionId, testCondition.name);
          Users.deleteViaApi(userId);
          PatronGroups.deleteViaApi(patronGroupId);
        });
      });
    });
  });
});
