import Permissions from '../../../../support/dictionary/permissions';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('SRS', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      "C788717 Verify that the entity types SRS Authority, Simple SRS record and SRS Bib are not available via API, if the user doesn't have the permissions (corsair)",
      { tags: ['extendedPath', 'corsair', 'C788717'] },
      () => {
        // #1 Login to the FOLIO using the user from pre-condition
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyNoEntityTypePermissionsWarning();

        // #2 Send GET {Base_URL}/entity-types?includeAll=true
        Lists.getAllEntityTypesIncludeAllViaApi().then((response) => {
          expect(response.status).to.equal(200);

          const { entityTypes } = response.body;

          // #3 Search for the entity type "SRS Authority"
          const srsAuthority = entityTypes.find((et) => et.label === 'SRS Authority');
          expect(srsAuthority).to.be.equal(undefined);

          // #4 Search for the entity type "SRS Bib"
          const srsBib = entityTypes.find((et) => et.label === 'SRS Bib');
          expect(srsBib).to.be.equal(undefined);

          // #5 Search for the entity type "Simple SRS record"
          const simpleSrsRecord = entityTypes.find((et) => et.label === 'Simple SRS record');
          expect(simpleSrsRecord).to.be.equal(undefined);
        });
      },
    );
  });
});
