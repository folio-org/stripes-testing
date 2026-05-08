import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  randomNDigitNumber,
  getRandomLetters,
} from '../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS, AUTHORITY_TYPES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomDigits = `440120${randomNDigitNumber(15)}`;
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag010: '010',
        tag100: '100',
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
        keywordSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        authorizedType: AUTHORITY_TYPES.AUTHORIZED,
      };

      const lccnTestData = [
        {
          heading: `AT_C440120_MarcAuthority 1 ${randomPostfix}`,
          lccn: `n ${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 2 ${randomPostfix}`,
          lccn: `n  ${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 3 ${randomPostfix}`,
          lccn: ` n${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 4 ${randomPostfix}`,
          lccn: `  n${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 5 ${randomPostfix}`,
          lccn: `  n  ${randomDigits}  `,
        },
        {
          heading: `AT_C440120_MarcAuthority 6 ${randomPostfix}`,
          lccn: `n${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 7 ${randomPostfix}`,
          lccn: `N ${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 8 ${randomPostfix}`,
          lccn: `N  ${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 9 ${randomPostfix}`,
          lccn: ` N${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 10 ${randomPostfix}`,
          lccn: `  N${randomDigits}`,
        },
        {
          heading: `AT_C440120_MarcAuthority 11 ${randomPostfix}`,
          lccn: `  N  ${randomDigits}  `,
        },
        {
          heading: `AT_C440120_MarcAuthority 12 ${randomPostfix}`,
          lccn: `N${randomDigits}`,
        },
      ];

      const searchQueries = [
        { query: `n${randomDigits}`, description: 'lower case prefix without spaces' },
        { query: `N${randomDigits}`, description: 'upper case prefix without spaces' },
        { query: `n ${randomDigits}`, description: 'lower case prefix with one space internal' },
        { query: `N ${randomDigits}`, description: 'upper case prefix with one space internal' },
        {
          query: `  n  ${randomDigits}  `,
          description: 'lower case prefix with two spaces everywhere',
        },
        {
          query: `  N  ${randomDigits}  `,
          description: 'upper case prefix with two spaces everywhere',
        },
      ];

      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 4401201,
      };

      const expectedHeadings = lccnTestData.map((record) => record.heading);
      const createdAuthorityIds = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C440120_');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            lccnTestData.forEach((recordData, index) => {
              const marcAuthorityFields = [
                {
                  tag: testData.tag010,
                  content: `$z ${recordData.lccn}`,
                  indicators: ['\\', '\\'],
                },
                {
                  tag: testData.tag100,
                  content: `$a ${recordData.heading}`,
                  indicators: ['1', '\\'],
                },
              ];
              MarcAuthorities.createMarcAuthorityViaAPI(
                authData.prefix,
                `${authData.startsWithNumber + index}`,
                marcAuthorityFields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C440120 Search for "MARC authority" by "LCCN" option using a query with lower, UPPER case when "Canceled LCCN" (010 $z) has (leading, internal, trailing) spaces". (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C440120'] },
        () => {
          // Steps 1-6: Run LCCN searches
          searchQueries.forEach((searchData, index) => {
            cy.log(`Step ${index + 1}: Run search with query with ${searchData.description}`);
            MarcAuthorities.searchByParameter(testData.searchOption, searchData.query);
            // Verify all 12 imported records are found
            expectedHeadings.forEach((heading) => {
              MarcAuthorities.checkAfterSearch(testData.authorizedType, heading);
            });
          });

          // Step 7: Run search with "Keyword" search option and expect only 2 records
          cy.log('Step 7: Run search with Keyword option');
          MarcAuthorities.searchByParameter(testData.keywordSearchOption, `n ${randomDigits}`);
          // Verify only 2 records are found (records with "one space internal")
          MarcAuthorities.checkRowsCount(2);
          MarcAuthorities.checkAfterSearch(testData.authorizedType, lccnTestData[0].heading);
          MarcAuthorities.checkAfterSearch(testData.authorizedType, lccnTestData[6].heading);
        },
      );
    });
  });
});
