import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
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
        searchQuery: 'C386511 United',
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
        authorityHeading:
          'C386511 United States. Department of State. Office of International Information',
        marcFile: {
          marc: 'C386511MarcAuth.mrc',
          fileName: `testMarcFile386511.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        createdAuthorityID: null,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C386511*');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdAuthorityID = response[0].authority.id;
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        if (testData.createdAuthorityID) {
          MarcAuthority.deleteViaAPI(testData.createdAuthorityID, true);
        }
      });

      it(
        'C386511 Switching between Search and Browse in "MARC authority" app (opened record deleted) (spitfire)',
        { tags: ['extendedPath', 'C386511', 'spitfire'] },
        () => {
          // Step 1: Select filter options that will return existing records
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
          MarcAuthoritiesSearch.filterByDateCreated(today, today);
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);

          // Step 2: Click "Search" button
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Click on "Heading/Reference" value to open detail view
          MarcAuthorities.selectItem(testData.authorityHeading);
          MarcAuthority.waitLoading();

          // Step 4: Select "Browse" toggle
          MarcAuthorities.switchToBrowse();
          cy.wait(1000);
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkDefaultBrowseOptions();

          // Step 5: Fill browse query and search for the opened record
          MarcAuthorities.selectSearchOptionInDropdown(testData.browseOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.authorityHeading);
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.authorityHeading);

          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 6: Switch back to Search toggle
          MarcAuthorities.switchToSearch();
          cy.wait(1000);
          MarcAuthorities.verifySearchTabIsOpened();
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 7: Click on heading again to open detail view
          MarcAuthorities.selectItem(testData.authorityHeading);
          MarcAuthority.waitLoading();

          // Step 8: Delete the authority record
          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.verifyDeleteComplete(testData.authorityHeading);

          // Step 9: Switch to Browse toggle and verify deleted record display
          MarcAuthorities.switchToBrowse();
          cy.wait(1000);
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthoritiesDelete.checkAfterDeletion(testData.authorityHeading);
        },
      );
    });
  });
});
