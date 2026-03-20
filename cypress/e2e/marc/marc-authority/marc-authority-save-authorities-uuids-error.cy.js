import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { calloutTypes } from '../../../../interactors';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchQuery: 'C773219 Twain',
      errorMessage: 'Error occurred while saving authorities UUIDs. Please try again.',
      authorityFields: [
        {
          tag: '100',
          content: '$a C773219 Twain, Mark, $d 1835-1910.',
          indicators: ['1', '\\'],
        },
      ],
      authData: {
        prefix: getRandomLetters(5),
        startWithNumber: '1',
      },
    };

    before('Create user and test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C773219*');

      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.authData.prefix,
            testData.authData.startWithNumber,
            testData.authorityFields,
          ).then((createdRecordId) => {
            testData.createdRecordId = createdRecordId;

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C773219 Verify error message when saving authority UUIDs (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C773219'] },
      () => {
        // Step 1: Search using Keyword — only 1 record should be found
        MarcAuthoritiesSearch.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, testData.searchQuery);
        MarcAuthorities.checkResultsListRecordsCount();

        // Step 2: Set up intercept BEFORE clicking button to simulate network failure
        cy.intercept('POST', '/search/resources/jobs', { forceNetworkError: true }).as(
          'saveUuidsJob',
        );

        // Step 3: Click Actions → "Save authorities UUIDs"
        MarcAuthorities.clickActionsButton();
        MarcAuthorities.clickSaveUuidsButton();

        // Wait for the intercepted request to ensure it was triggered
        cy.wait('@saveUuidsJob');

        // Step 4: Verify error toast notification is shown
        InteractorsTools.checkCalloutContainsMessage(testData.errorMessage, calloutTypes.error);
      },
    );
  });
});
