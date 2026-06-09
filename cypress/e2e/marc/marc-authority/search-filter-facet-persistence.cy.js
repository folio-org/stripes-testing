import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DateTools from '../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const testData = {
        searchQuery: '*',
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
        personalNameOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
        filters: {
          authoritySource: 'LC Name Authority file (LCNAF)',
          excludeSeeFromAlso: REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          thesaurus: 'Library of Congress Subject Headings',
          typeOfHeading: 'Personal Name',
        },
        dateCreated: {
          from: null,
          to: null,
        },
      };

      before('Create user and login', () => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.userProperties = userProperties;

            // Set date range: last 365 days to current date
            const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
            const oneYearAgo = DateTools.getFormattedDate(
              { date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) },
              'YYYY-MM-DD',
            );
            testData.dateCreated.from = oneYearAgo;
            testData.dateCreated.to = today;

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        FileManager.deleteFileFromDownloadsByMask('SearchAuthorityUUIDs*');
      });

      it(
        "C365114 Verify that applied filters and facets don't reset when user switching between search result pages and export UUIDs (spitfire)",
        { tags: ['extendedPath', 'spitfire', 'C365114'] },
        () => {
          MarcAuthorities.verifySearchTabIsOpened();

          // Step 1-2: Search with "*" to return 300+ records
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);
          MarcAuthorities.checkNextPaginationButtonEnabled(true);

          // Step 3: Apply "Authority source" facet
          MarcAuthorities.chooseAuthoritySourceOption(testData.filters.authoritySource);
          MarcAuthorities.checkSelectedAuthoritySource(testData.filters.authoritySource);

          // Step 4: Apply "References" filter
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(testData.filters.excludeSeeFromAlso);

          // Step 5-6: Apply Thesaurus facet
          MarcAuthorities.clickAccordionByName('Thesaurus');
          MarcAuthorities.chooseThesaurus(testData.filters.thesaurus);
          MarcAuthorities.verifySelectedTextOfThesaurus(testData.filters.thesaurus);

          // Step 7-8: Apply Type of heading facet
          MarcAuthorities.chooseTypeOfHeading(testData.filters.typeOfHeading);

          // Step 9-11: Apply Date created filter
          MarcAuthoritiesSearch.filterByDateCreated(
            testData.dateCreated.from,
            testData.dateCreated.to,
          );

          // Step 12: Navigate to next page - verify filters persist
          MarcAuthorities.clickNextPagination();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(true);
          MarcAuthorities.checkSelectedAuthoritySource(testData.filters.authoritySource);
          MarcAuthorities.verifySelectedTextOfThesaurus(testData.filters.thesaurus);

          // Step 13: Navigate to previous page - verify filters persist
          MarcAuthorities.clickPreviousPagination();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);
          MarcAuthorities.checkSelectedAuthoritySource(testData.filters.authoritySource);
          MarcAuthorities.verifySelectedTextOfThesaurus(testData.filters.thesaurus);

          // Step 14-15: Change search option to "Personal name" - verify filters persist
          MarcAuthorities.selectSearchOptionInDropdown(testData.personalNameOption);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkSelectedAuthoritySource(testData.filters.authoritySource);
          MarcAuthorities.verifySelectedTextOfThesaurus(testData.filters.thesaurus);

          // Step 16: Export UUIDs and verify file download
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.clickSaveUuidsButton();
          FileManager.findDownloadedFilesByMask('SearchAuthorityUUIDs*').then((downloadedFiles) => {
            expect(downloadedFiles.length).to.be.greaterThan(0);
          });
        },
      );
    });
  });
});
