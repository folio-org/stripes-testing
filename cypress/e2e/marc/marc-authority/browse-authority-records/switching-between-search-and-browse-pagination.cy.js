import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
  MARC_AUTHORITY_SEARCH_OPTIONS,
  REFERENCES_FILTER_CHECKBOXES,
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
        browseQuery: 'Erbil',
        marcFile: {
          marc: 'C386499MarcAuth.mrc',
          fileName1: `testMarcFile386499_1.${getRandomPostfix()}.mrc`,
          fileName2: `testMarcFile386499_2.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        createdAuthorityIDs: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        // Clean up any existing C386499 records from previous test runs
        // Called twice because test uploads 100 records twice (total 200)
        // and deleteMarcAuthorityByTitleViaAPI has limit of 100
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C386499*');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C386499*');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            // Upload file twice to ensure >100 MARC Authority records
            DataImport.uploadFileViaApi(
              testData.marcFile.marc,
              testData.marcFile.fileName1,
              testData.marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.createdAuthorityIDs.push(record.authority.id);
              });
            });

            DataImport.uploadFileViaApi(
              testData.marcFile.marc,
              testData.marcFile.fileName2,
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
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C386499 Switching between Search and Browse in "MARC authority" app (page change) (spitfire)',
        { tags: ['extendedPath', 'C386499', 'spitfire'] },
        () => {
          // Step 1: Select filter options that will return more than 100 existing records
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );
          MarcAuthoritiesSearch.filterByDateCreated(today, today);

          // Step 2: Click "Search" button
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);
          MarcAuthorities.checkNextPaginationButtonEnabled(true);

          // Step 3: Click at "Next >" link at the bottom of the screen
          MarcAuthorities.clickNextPagination();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(true);

          // Step 4: Select "Browse" toggle
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Step 5: Set up browse query and filters
          MarcAuthorities.selectSearchOptionInDropdown(testData.browseOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.browseQuery);
          MarcAuthorities.chooseAuthoritySourceOption('LC Name Authority file (LCNAF)');
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );

          // Step 6: Click "Search" button
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 7: Select "Search" toggle - verify state is same as Step 3 (page 2 shown)
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(true);

          // Step 8: Select "Browse" toggle - verify browse results same as Step 6
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 9: Click at any pagination button in browse pane
          MarcAuthorities.clickNextPaginationButtonIfEnabled().then((wasEnabled) => {
            if (!wasEnabled) {
              MarcAuthorities.clickPreviousPagination();
            }
          });
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 10: Select "Search" toggle → click at "< Previous" button
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.clickPreviousPagination();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPreviousPaginationButtonEnabled(false);

          // Step 11: Select "Browse" toggle - verify browse results remain from Step 9
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        },
      );
    });
  });
});
