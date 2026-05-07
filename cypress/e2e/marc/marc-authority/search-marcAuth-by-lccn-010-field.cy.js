import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  AUTHORITY_TYPES,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../support/constants';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(13);
      const testData = {
        tag001: '001',
        tag010: '010',
        tag024: '024',
        tag035: '035',
        tag130: '130',
        authorityHeadingPrefix: `AT_C422024_MarcAuthority_${randomPostfix}`,
        sourceFilePrefix: 'n',
        lccnNumberBase: `422024${randomDigits}${randomDigits}`,
        lccnSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
        keywordSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        advancedSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
        authorizedType: AUTHORITY_TYPES.AUTHORIZED,
      };

      const authorityHeadings = {
        numbersIn024_1: `${testData.authorityHeadingPrefix} (024 field)`,
        numbersIn010: `${testData.authorityHeadingPrefix} (010Sa field and 010Sz field)`,
        numbersIn024_2: `${testData.authorityHeadingPrefix} (024 field)`,
        numbersIn035: `${testData.authorityHeadingPrefix} (035 fields)`,
      };

      const searchQueries = {
        lccn_010a: `${testData.sourceFilePrefix} ${testData.lccnNumberBase}95`,
        lccn_010z: `${testData.sourceFilePrefix} ${testData.lccnNumberBase}96`,
      };

      const authority001Numbers = [
        ` ${testData.lccnNumberBase}95`,
        getRandomLetters(15),
        ` ${testData.lccnNumberBase}96`,
        getRandomLetters(15),
      ];

      const authorityFields = [
        [
          {
            tag: testData.tag024,
            content: `$a ${searchQueries.lccn_010z}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn024_1}`,
            indicators: ['1', '0'],
          },
        ],
        [
          {
            tag: testData.tag010,
            content: `$a ${searchQueries.lccn_010a} $z ${searchQueries.lccn_010z}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn010}`,
            indicators: ['1', '0'],
          },
        ],
        [
          {
            tag: testData.tag024,
            content: `$a ${searchQueries.lccn_010a}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn024_2}`,
            indicators: ['1', '0'],
          },
        ],
        [
          {
            tag: testData.tag035,
            content: `$a ${searchQueries.lccn_010a}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag035,
            content: `$a ${searchQueries.lccn_010z}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn035}`,
            indicators: ['1', '0'],
          },
        ],
      ];

      const createdAuthorityIds = [];

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422024_');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.then(() => {
              authorityFields.forEach((fields, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  testData.sourceFilePrefix,
                  authority001Numbers[index],
                  fields,
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              });
            }).then(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          },
        );
      });

      after('Delete users, data', () => {
        cy.wait(3000); // workaround for https://folio-org.atlassian.net/browse/STCOR-1012
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C422024 "MARC authority" app | Verify that "LCCN" search option searches by "$a" and "$z" subfields of "010" field only (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422024'] },
        () => {
          // Step 1: Run search by LCCN match based on "010 $a"
          MarcAuthorities.selectSearchOptionInDropdown(testData.lccnSearchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.lccnSearchOption);
          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );

          MarcAuthorities.searchBeats(searchQueries.lccn_010a);
          MarcAuthority.waitLoading();
          // Verify only one record is found: "LCCN search test (010Sa field and 010Sz field)"
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch(testData.authorizedType, authorityHeadings.numbersIn010);

          // Step 2: Click "Reset all" button
          // Verify "Keyword" is selected, search box is empty, checkboxes are not checked, no records displayed
          MarcAuthorities.clickResetAndCheck();

          // Step 3: Check both checkboxes in "References" accordion
          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );

          // Step 4: Run search by LCCN match based on "010 $z"
          MarcAuthorities.selectSearchOptionInDropdown(testData.lccnSearchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.lccnSearchOption);

          MarcAuthorities.searchBeats(searchQueries.lccn_010z);
          MarcAuthority.waitLoading();
          // Verify only one record is found with "Authorized" value
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch(testData.authorizedType, authorityHeadings.numbersIn010);

          // Step 5: Click "Reset all" button
          // Verify "Keyword" is selected, search box is empty, checkboxes are not checked, no records displayed
          MarcAuthorities.clickResetAndCheck();

          // Step 6: Check both checkboxes in "References" accordion
          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );

          // Steps 7-9: Open Advanced search, fill first row with 010 $a value, and search
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.fillAdvancedSearchField(
            0,
            searchQueries.lccn_010a,
            testData.lccnSearchOption,
          );
          // for unclear reasons, search fails without this wait
          // cy.wait(2000);
          MarcAuthorities.clickSearchButton();
          MarcAuthority.waitLoading();
          // Verify "Advanced search" modal is closed and matching record is displayed
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch(testData.authorizedType, authorityHeadings.numbersIn010);

          // Steps 10-12: Open Advanced search, add second row with 010 $z value with AND, and search
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.fillAdvancedSearchField(
            1,
            searchQueries.lccn_010z,
            testData.lccnSearchOption,
          );
          // for unclear reasons, search fails without this wait
          // cy.wait(2000);
          MarcAuthorities.clickSearchButton();
          MarcAuthority.waitLoading();
          // Verify "Advanced search" modal is closed and matching record is displayed
          MarcAuthorities.checkRowsCount(1);
          MarcAuthorities.checkAfterSearch(testData.authorizedType, authorityHeadings.numbersIn010);
        },
      );
    });
  });
});
