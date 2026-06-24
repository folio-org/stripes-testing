import Permissions from '../../../../support/dictionary/permissions';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('SRS', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.sourceStorageRecordsCollectionGet.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C788715 Verify "Simple SRS record" and "SRS Bib" entity types availability via API with correct permissions (corsair)',
      { tags: ['extendedPath', 'corsair', 'C788715'] },
      () => {
        // #1 Login to the FOLIO using the user from pre-condition
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #2 Click on "Lists" app
        Lists.verifyNoEntityTypePermissionsWarning();

        // #3 Send GET {Base_URL}/entity-types?includeAll=true
        Lists.getAllEntityTypesIncludeAllViaApi().then((response) => {
          expect(response.status).to.equal(200);

          const { entityTypes } = response.body;

          // #4 Search for the entity type "Simple SRS record"
          const simpleSrsRecord = entityTypes.find(
            (et) => et.label === 'Simple SRS record',
          );
          expect(simpleSrsRecord.label).to.equal('Simple SRS record');
          expect(simpleSrsRecord.crossTenantQueriesEnabled).to.equal(false);
          expect(simpleSrsRecord.missingPermissions).to.be.equal(null);

          // #5 Search for the entity type "SRS Bib"
          const srsBib = entityTypes.find(
            (et) => et.label === 'SRS Bib',
          );
          expect(srsBib.label).to.equal('SRS Bib');
          expect(srsBib.crossTenantQueriesEnabled).to.equal(false);
          expect(srsBib.missingPermissions).to.be.equal(null);
        });
      },
    );
  });
});
