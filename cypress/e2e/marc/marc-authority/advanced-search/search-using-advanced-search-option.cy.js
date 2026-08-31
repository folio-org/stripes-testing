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
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Advanced Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `476733${randomNDigitNumber(17)}`;
      const testData = {
        authorityRecord: {
          heading: `AT_C476733_MarcAuthority_${randomPostfix}`,
          authData: { prefix: getRandomLetters(15), startWithNumber: '1' },
        },
        searchQueryOneSpace: `n ${randomDigits}`,
        searchQueryTwoSpaces: `n  ${randomDigits}`,
        noResultsQuery: `identifiers.value exactPhrase n ${randomDigits}`,
        updatedQuery: `identifiers.value exactPhrase n  ${randomDigits}`,
      };
      let authorityId;

      before('Create user and test data', () => {
        cy.getAdminToken();
        [
          testData.searchQueryOneSpace,
          testData.searchQueryTwoSpaces,
          testData.searchQueryOneSpace.replace(' ', ''),
        ].forEach((identifier) => {
          MarcAuthorities.deleteMarcAuthorityByIdentifierViaAPI(identifier);
        });
        cy.then(() => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C476733_');
        })
          .then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.authorityRecord.authData.prefix,
              testData.authorityRecord.authData.startWithNumber,
              [
                {
                  tag: '100',
                  content: `$a ${testData.authorityRecord.heading}`,
                  indicators: ['\\', '\\'],
                },
                {
                  tag: '010',
                  content: `$a ${testData.searchQueryTwoSpaces}`,
                  indicators: ['\\', '\\'],
                },
              ],
            ).then((recordId) => {
              authorityId = recordId;
            });
          })
          .then(() => {
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
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        MarcAuthority.deleteViaAPI(authorityId, true);
        Users.deleteViaApi(testData.userProperties?.userId);
      });

      it(
        'C476733 Search using "Advanced search" option (promin)',
        { tags: ['extendedPath', 'promin', 'C476733'] },
        () => {
          // Step 1: Open Advanced search modal
          MarcAuthorities.clickAdvancedSearchButton();

          // Steps 2-4: Fill row 0 with one-space query, select Exact phrase + Identifier (all)
          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.searchQueryOneSpace,
            MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
            null,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            testData.searchQueryOneSpace,
            MARC_AUTHORITY_SEARCH_OPTIONS.IDENTIFIER_ALL,
            null,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          );

          // Step 5: Search → modal closes, no records found (record has 2 spaces in 010 $a)
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.verifyEmptySearchResults(testData.noResultsQuery);

          // Step 6: Add extra space in search box → two-space query
          MarcAuthoritiesSearch.fillSearchInput(testData.updatedQuery);
          cy.wait(2000);
          // Step 7: Search → record found (010 $a matches two-space query exactly)
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifyRecordFound(testData.authorityRecord.heading);
        },
      );
    });
  });
});
