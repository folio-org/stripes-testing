import { Permissions } from '../../../support/dictionary';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const testData = {
        searchOption: 'Keyword',
        searchQuery: '*',
      };

      before('Create user and login', () => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C624371 Search for MARC authority record when user is offline (search request is canceled) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C624371'] },
        () => {
          // Step 1: Simulate offline network condition by intercepting search request with forceNetworkError
          cy.intercept('GET', '/search/authorities?*', { forceNetworkError: true }).as(
            'searchAuthorities',
          );

          // Step 2: Run search with Keyword option and "*" query
          MarcAuthorities.searchBy(testData.searchOption, testData.searchQuery);
          cy.wait('@searchAuthorities');

          // Step 2: Verify error message is displayed on the second pane
          MarcAuthorities.verifySearchErrorText(testData.searchQuery);
        },
      );
    });
  });
});
