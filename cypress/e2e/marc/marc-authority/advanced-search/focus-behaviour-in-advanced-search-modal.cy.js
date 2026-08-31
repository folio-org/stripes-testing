import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  ADVANCED_SEARCH_MODIFIERS,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Advanced Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(15);
      const testData = {
        authorityRecords: [
          {
            heading: `AT_C468270_MarcAuthority_1_${randomPostfix}`,
            authData: { prefix: randomLetters, startWithNumber: '1' },
          },
          {
            heading: `AT_C468270_MarcAuthority_2_${randomPostfix}`,
            authData: { prefix: randomLetters, startWithNumber: '2' },
          },
        ],
        updatedQuery: `AT_C468270_UpdatedQuery_${randomPostfix}`,
      };

      const authorityIds = [];

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C468270_');

        testData.authorityRecords.forEach((rec, idx) => {
          MarcAuthorities.createMarcAuthorityViaAPI(
            rec.authData.prefix,
            rec.authData.startWithNumber,
            [
              {
                tag: '100',
                content: `$a ${rec.heading}`,
                indicators: ['\\', '\\'],
              },
            ],
          ).then((recordId) => {
            authorityIds[idx] = recordId;
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.userProperties = userProperties;

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
        Users.deleteViaApi(testData.userProperties?.userId);
      });

      it(
        'C468270 Focus behaviour in "Advanced search" modal of "MARC authority" app (promin)',
        { tags: ['extendedPath', 'promin', 'C468270'] },
        () => {
          // Step 1: Select "Advanced search" search option
          MarcAuthoritiesSearch.selectSearchOption(MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH);

          // Step 2: Enter first query into the search box → Search button enabled
          MarcAuthoritiesSearch.fillSearchInput(testData.authorityRecords[0].heading);

          // Step 3: Open Advanced search modal → cursor at end of entered term in row 0
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.verifyAdvancedSarchInputFieldFocused(0);

          // Step 4: Fill row 1 with OR + second query + Contains any → search → results found
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.authorityRecords[1].heading,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            'OR',
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            testData.authorityRecords[1].heading,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            'OR',
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
          );
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.checkResultList([
            testData.authorityRecords[0].heading,
            testData.authorityRecords[1].heading,
          ]);

          // Step 5: Reopen modal → cursor at row 1 (last filled row)
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.verifyAdvancedSarchInputFieldFocused(1);

          // Step 6: Edit row 0 query
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.updatedQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            null,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.updatedQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            null,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          );

          // Step 7: Close modal
          MarcAuthorities.closeAdvSearchModal();

          // Step 8: Reopen modal → cursor at row 0 (last edited row)
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.verifyAdvancedSarchInputFieldFocused(0);

          // Step 9: Select "Starts with" match option in third row (no query entered)
          MarcAuthorities.selectMatchOptionInAdvancedSearchModal(
            2,
            ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            2,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            null,
            ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
          );

          // Step 10: Close modal
          MarcAuthorities.closeAdvSearchModal();

          // Step 11: Reopen modal → cursor at row 1 (last row which has query; row 2 has no query)
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.verifyAdvancedSarchInputFieldFocused(1);
        },
      );
    });
  });
});
