import TestType from '../../../support/dictionary/testTypes';
import Features from '../../../support/dictionary/features';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Patron blocks relations with users, conditions', () => {
  it("C11020 Verify user information display when automated patron block 'Maximum outstanding fee/fine balance' exists for patron", { tags: [TestType.smoke, Features.patronBlocks] }, () => {
    const patronGroupName = `auttestPatronGroup${getRandomPostfix()}`;
    PatronGroups.createViaApi(patronGroupName).then(uuid => {
      const lastName = `Test-${uuid()}`;
      const userData = {
        active: true,
        barcode: uuid(),
        personal: {
          preferredContactTypeId: '002',
          lastName,
          email: 'test@folio.org',
        },
        // patronGroup,
        departments: []
      };
      cy.createUserApi(userData);


      // test data clearing
      PatronGroups.deleteViaApi();
    });
  });
});
