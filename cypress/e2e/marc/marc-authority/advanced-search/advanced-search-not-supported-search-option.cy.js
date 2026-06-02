import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  ADVANCED_SEARCH_MODIFIERS,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C423710_MarcAuthority_${randomPostfix}`,
        searchQuery: 'AT_C423710',
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        matchOption: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
      };
      const expectedQueryInSearchBox = `keyword containsAll ${testData.authorityHeading}`;

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '423710',
      };

      const authorityFields = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      let createdAuthorityId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423710_');
        MarcAuthorities.createMarcAuthorityViaAPI(
          authData.prefix,
          authData.startWithNumber,
          authorityFields,
        ).then((createdRecordId) => {
          createdAuthorityId = createdRecordId;
        });

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
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C423710 Using Advanced search with search query with not supported search option "Advanced search" in MARC authority app (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423710'] },
        () => {
          // Precondition: select "Advanced search" search option
          MarcAuthorities.selectSearchOptionInDropdown(
            MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
          );

          // Step 1: Enter search query in the search box
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);

          // Step 2: Click the "Advanced search" button
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.searchQuery,
            testData.searchOption,
            null,
            testData.matchOption,
          );

          // Step 3: Update search query in the modal
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.authorityHeading,
            testData.searchOption,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.authorityHeading,
            testData.searchOption,
            null,
            testData.matchOption,
          );

          // Step 4: Click "Search" button in the modal
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkSelectOptionFieldContent(
            MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
          );
          MarcAuthorities.checkSearchInput(expectedQueryInSearchBox);
          MarcAuthorities.verifyRecordFound(testData.authorityHeading);
        },
      );
    });
  });
});
