import {
  DEFAULT_JOB_PROFILE_NAMES,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        searchQuery: {
          multipleResults: 'C386496 United',
          singleResult:
            'C386496 United States. Department of State. Office of International Information',
        },
        browseQuery: 'C386496 R',
        searchOptions: {
          corporateConferenceName: 'Corporate/Conference name',
          nameTitle: 'Name-title',
        },
        browseOptions: {
          personalName: 'Personal name',
        },
        filters: {
          authoritySource: 'LC Name Authority file (LCNAF)',
          typeOfHeading: 'Personal Name',
        },
        marcFiles: [
          {
            marc: 'C386496MarcAuth.mrc',
            fileName: `testMarcFile386496.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 100,
          },
        ],
        createdAuthorityIDs: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        // Delete any existing test records
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C386496 "',
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id, true);
            });
          }
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            // Upload MARC authority files
            testData.marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  testData.createdAuthorityIDs.push(record.authority.id);
                });
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
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C386496 Switching between Search and Browse in "MARC authority" app (detail view) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C386496'] },
        () => {
          // Step 1: Set up initial search with filters
          MarcAuthorities.searchByParameter(
            testData.searchOptions.corporateConferenceName,
            testData.searchQuery.multipleResults,
          );
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );

          // Step 2: Execute search and verify results
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkResultsExistance('Authorized');

          // Step 3: Switch to Browse toggle
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Step 4: Set up browse with filters
          MarcAuthorityBrowse.searchBy(testData.browseOptions.personalName, testData.browseQuery);

          // Apply Authority source filter
          MarcAuthorities.chooseAuthoritySourceOption(testData.filters.authoritySource);

          // Apply Type of heading filter
          MarcAuthorities.chooseTypeOfHeading(testData.filters.typeOfHeading);

          // Step 5: Execute browse search and verify results
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 6: Switch back to Search
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();

          // Verify Search state is retained
          MarcAuthorities.checkSearchInput(testData.searchQuery.multipleResults);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 7: Open detail view from search results
          MarcAuthorities.selectIncludingTitle('C386496 United States. Department of State');
          MarcAuthority.waitLoading();
          MarcAuthority.contains('C386496 United States. Department of State');

          // Step 8: Switch to Browse
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Verify Browse state is retained
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 9: Open detail view from browse results
          MarcAuthorities.selectFirstRecord();
          MarcAuthority.waitLoading();

          // Step 10: Switch to Search
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();

          // Verify Search state is retained
          MarcAuthorities.checkSearchInput(testData.searchQuery.multipleResults);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Verify previously selected record is highlighted
          MarcAuthorities.checkRowUpdatedAndHighlighted(
            'C386496 United States. Department of State',
          );

          // Step 11: Search for single result
          MarcAuthorities.searchByParameter(
            testData.searchOptions.corporateConferenceName,
            testData.searchQuery.singleResult,
          );

          // Verify single result with auto-opened detail view
          MarcAuthorities.checkRowsCount(1);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.searchQuery.singleResult);

          // Step 12: Switch to Browse
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Verify Browse state is retained
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 13: Switch back to Search
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();

          // Verify single result with auto-opened detail view
          MarcAuthorities.checkRowsCount(1);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.searchQuery.singleResult);
        },
      );
    });
  });
});
