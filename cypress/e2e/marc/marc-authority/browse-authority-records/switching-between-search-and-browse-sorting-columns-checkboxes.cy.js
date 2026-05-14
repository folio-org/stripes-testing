import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const today = DateTools.getCurrentDateForFiscalYear();
      const testData = {
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
        searchQuery: '*',
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
        browseQuery: 'r',
        columnToHideInSearch: 'Authorized/Reference',
        columnToHideInBrowse: 'Number of titles',
        marcFile: {
          marc: 'C386510MarcAuth.mrc',
          fileName: `testMarcFile386510.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        createdAuthorityIDs: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        // Clean up any existing C386510 records from previous test runs
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C386510*');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            // Upload file with 100 MARC Authority records (more than 50+ required)
            DataImport.uploadFileViaApi(
              testData.marcFile.marc,
              testData.marcFile.fileName,
              testData.marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.createdAuthorityIDs.push(record.authority.id);
              });
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        // Restore column visibility to default state
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        MarcAuthorities.clickActionsButton();
        MarcAuthorities.setActionsCheckboxState(testData.columnToHideInSearch, true);
        MarcAuthorities.setActionsCheckboxState(testData.columnToHideInBrowse, true);

        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C386510 Switching between Search and Browse in "MARC authority" app (sorting, columns, checkboxes) (spitfire)',
        { tags: ['extendedPath', 'C386510', 'spitfire'] },
        () => {
          // Step 1: Select filter options that will return 50 or more existing records
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
          MarcAuthorities.chooseAuthoritySourceOption('LC Name Authority file (LCNAF)');
          MarcAuthoritiesSearch.filterByDateCreated(today, today);
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);

          // Step 2: Click "Search" button
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Click at any column header in the result list (e.g., "Heading/Reference")
          MarcAuthorities.clickOnColumnHeader('Heading/Reference');
          cy.wait(1000); // Wait for sort to complete

          // Step 4: Click "Actions" button → Uncheck any option in "Show columns" section
          MarcAuthorities.clickActionsButton();
          cy.wait(500); // Wait for actions menu to open
          MarcAuthorities.setActionsCheckboxState(testData.columnToHideInSearch, false);
          MarcAuthorities.checkColumnAbsent(testData.columnToHideInSearch);

          // Step 5: Scroll down and select checkboxes for some rows
          MarcAuthorities.clickNextPagination();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Select checkboxes for some rows
          MarcAuthorities.selectCheckboxByRowIndex(2);
          MarcAuthorities.selectCheckboxByRowIndex(5);

          // Step 6: Select "Browse" toggle at "Search & filter" pane
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkDefaultBrowseOptions();

          // Step 7: Select filter options for Browse that will return 50 or more existing records
          MarcAuthorities.selectSearchOptionInDropdown(testData.browseOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.browseQuery);
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.browseQuery);

          // Step 8: Click "Search" button
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Apply filters after search in Browse mode
          MarcAuthorities.chooseAuthoritySourceOption('LC Name Authority file (LCNAF)');
          cy.wait(1000);

          // Step 9: Click "Actions" button → Uncheck any option in "Show columns" section
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.setActionsCheckboxState(testData.columnToHideInBrowse, false);
          MarcAuthorities.checkColumnAbsent(testData.columnToHideInBrowse);

          // Step 10: Scroll down and select checkboxes for some rows in Browse
          MarcAuthorities.clickNextPaginationButtonIfEnabled();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Select checkboxes for some rows in Browse
          MarcAuthorities.selectCheckboxByRowIndex(10);
          MarcAuthorities.selectCheckboxByRowIndex(15);

          // Step 11: Select "Search" toggle → Verify state is retained
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();

          // Search option/filters/query are the same as at Step 2
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);

          // Columns in results list are the same as at Step 9 (both columns hidden)
          MarcAuthorities.checkColumnAbsent(testData.columnToHideInSearch);
          MarcAuthorities.checkColumnAbsent(testData.columnToHideInBrowse);

          // All checkboxes in results list are unchecked
          MarcAuthorities.verifyAllCheckboxesAreUnchecked();

          // Step 12: Click "Reset all" button
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD);
          MarcAuthorities.checkSearchInput('');
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);

          // Step 13: Select "Browse" toggle → Verify state is retained
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Browse option/filters/query are the same as at Step 8
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.browseQuery);

          // Columns in results list are the same as at Step 9
          MarcAuthorities.checkColumnAbsent(testData.columnToHideInSearch);
          MarcAuthorities.checkColumnAbsent(testData.columnToHideInBrowse);

          // All checkboxes in results list are unchecked
          MarcAuthorities.verifyAllCheckboxesAreUnchecked();

          // Results should be visible
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 14: Click "Reset all" button
          MarcAuthorities.clickReset();
          MarcAuthorities.checkDefaultBrowseOptions();
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
        },
      );
    });
  });
});
