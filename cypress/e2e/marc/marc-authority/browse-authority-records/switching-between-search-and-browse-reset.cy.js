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
        browseQuery: 'C386497 R',
        searchQuery: 'C386497 United',
        browseOptions: {
          personalName: 'Personal name',
        },
        searchOptions: {
          corporateConferenceName: 'Corporate/Conference name',
        },
        filters: {
          authoritySource: 'LC Name Authority file (LCNAF)',
          typeOfHeading: 'Personal Name',
        },
        marcFiles: [
          {
            marc: 'C386497MarcAuth.mrc',
            fileName: `testMarcFile386497.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 100,
          },
        ],
        createdAuthorityIDs: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C386497*"',
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id);
            });
          }
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            testData.userProperties = createdUserProperties;

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
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C386497 Switching between Search and Browse in "MARC authority" app (reset) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C386497'] },
        () => {
          // Step 1: Set up Browse with filters
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorityBrowse.searchBy(testData.browseOptions.personalName, testData.browseQuery);
          MarcAuthorities.chooseAuthoritySourceOption(testData.filters.authoritySource);
          MarcAuthorities.chooseTypeOfHeading(testData.filters.typeOfHeading);

          // Step 2: Verify Browse results are shown
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Switch to Search
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();

          // Step 4: Set up Search with filters
          MarcAuthorities.searchByParameter(
            testData.searchOptions.corporateConferenceName,
            testData.searchQuery,
          );
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );

          // Step 5: Verify Search results are shown
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 6: Switch to Browse - verify Browse state is retained
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 7: Switch to Search - verify Search state is retained
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.checkSearchInput(testData.searchQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 8: Switch to Browse and click Reset all
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.clickResetAndCheckBrowse();

          // Step 9: Switch to Search - verify Search state is still retained
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.checkSearchInput(testData.searchQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 10: Reset all in Search
          MarcAuthorities.clickResetAndCheck();

          // Step 11: Switch to Browse - verify Browse state is still cleared
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkDefaultBrowseOptions();
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);

          // Step 12: Switch to Search - verify Search state is still cleared
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.checkSearchOption('keyword');
          MarcAuthorities.checkSearchInput('');
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);
        },
      );
    });
  });
});
