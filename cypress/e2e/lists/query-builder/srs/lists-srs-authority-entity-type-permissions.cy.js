import Permissions from '../../../../support/dictionary/permissions';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('SRS', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C788714 Verify SRS Authority entity type availability via API with correct permissions (athena)',
      { tags: ['extendedPath', 'athena', 'C788714'] },
      () => {
        // #1 Login to the FOLIO using the user from pre-condition
        cy.login(userData.username, userData.password);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.LISTS);
        TopMenuNavigation.verifyAppButtonShown(APPLICATION_NAMES.MARC_AUTHORITY);

        // #2 Click on "Lists" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
        Lists.waitLoading();

        // #3 Send GET {Base_URL}/entity-types?includeAll=true
        Lists.getAllEntityTypesIncludeAllViaApi().then((response) => {
          expect(response.status).to.equal(200);

          const { entityTypes } = response.body;

          // #4 Search for the entity type "SRS Authority"
          const srsAuthority = entityTypes.find((et) => et.label === 'SRS Authority');
          expect(srsAuthority.label).to.equal('SRS Authority');
          expect(srsAuthority.crossTenantQueriesEnabled).to.equal(false);
          expect(srsAuthority.missingPermissions).to.be.equal(null);
        });
      },
    );
  });
});
