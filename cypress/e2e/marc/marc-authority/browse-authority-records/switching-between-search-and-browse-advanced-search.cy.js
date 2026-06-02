import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
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
        advancedSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
        searchQueries: {
          first:
            'identifiers.value containsAll n00063831 or identifiers.value containsAll n91028048',
          second:
            'geographicName containsAll Cooperstown (N.D.)  and keyword containsAll Cooperstown',
        },
        browseQuery: 'C386498 R',
        browseOption: 'Personal name',
        filters: {
          authoritySource: 'LC Name Authority file (LCNAF)',
          excludeSeeFrom: REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
        },
        expectedResults: {
          firstQuery: ['C386498 Phillips, Bob, 1951-', 'C386498 Santritter, Joannes Lucilius'],
          secondQuery: 'C386498 Cooperstown (N.D.)',
        },
        authorizedType: 'Authorized',
        marcFile: {
          marc: 'C386498MarcAuth.mrc',
          fileName: `testMarcFile386498.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numberOfRecords: 100,
        },
        createdAuthorityIDs: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="C386498*"',
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
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      // KNOWN ISSUE: Steps 5 fail due to UIMARCAUTH-532
      it(
        'C386498 Switching between Search and Browse in "MARC authority" app (advanced search) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C386498'] },
        () => {
          // Step 1: Select "Advanced search" option, fill query and apply filters
          MarcAuthorities.selectSearchOptionInDropdown(testData.advancedSearchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.advancedSearchOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQueries.first);
          MarcAuthorities.chooseAuthoritySourceOption(testData.filters.authoritySource);
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(testData.filters.excludeSeeFrom);

          // Step 2: Click "Search" and verify results
          MarcAuthoritiesSearch.clickSearchButton();
          testData.expectedResults.firstQuery.forEach((heading) => {
            MarcAuthorities.checkAfterSearch(testData.authorizedType, heading);
          });
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Switch to Browse
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Step 4: Fill browse query and search
          MarcAuthorityBrowse.searchBy(testData.browseOption, testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 5: Switch to Search - verify state is same as Step 2
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.checkSelectOptionFieldContent(testData.advancedSearchOption);
          MarcAuthorities.checkSearchInput(testData.searchQueries.first);
          testData.expectedResults.firstQuery.forEach((heading) => {
            MarcAuthorities.checkAfterSearch(testData.authorizedType, heading);
          });
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 6: Update search query with another value
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQueries.second);

          // Step 7: Click "Search" and verify single result with detail view
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.checkAfterSearch(
            testData.authorizedType,
            testData.expectedResults.secondQuery,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 8: Switch to Browse - verify browse results still from Step 4
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 9: Switch to Search - verify state same as Step 7
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.checkSelectOptionFieldContent(testData.advancedSearchOption);
          MarcAuthorities.checkSearchInput(testData.searchQueries.second);
          MarcAuthorities.checkAfterSearch(
            testData.authorizedType,
            testData.expectedResults.secondQuery,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 10: Click "Reset all" - verify Search is cleared
          MarcAuthorities.clickResetAndCheck();

          // Step 11: Switch to Browse - verify browse results still displayed (not affected by reset)
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 12: Switch to Search - verify search state is still cleared
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
