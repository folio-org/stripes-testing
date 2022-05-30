import TestType from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';

describe('Patron blocks relations with users, conditions', () => {
  it("C11020 Verify user information display when automated patron block 'Maximum outstanding fee/fine balance' exists for patron", { tags: [TestType.smoke, Features.patronBlocks] }, () => {
    cy.getAdminToken();

    const patronGroupName = `auttestPatronGroup${getRandomPostfix()}`;
    PatronGroups.createViaApi(patronGroupName).then(patronGroupId => {
      Users.createUserApi({ ...Users.defaultUser, patronGroup: patronGroupId }).then(userId => {
        console.log(patronGroupId);
        console.log(userId);





        // test data clearing
        Users.deleteViaApi(userId);
        PatronGroups.deleteViaApi(patronGroupId);
      });
    });
  });
});
