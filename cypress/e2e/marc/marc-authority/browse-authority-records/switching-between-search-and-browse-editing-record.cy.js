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
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const today = DateTools.getCurrentDateForFiscalYear();
      const testData = {
        // Search mode configuration - Corporate/Conference name search
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.CORPORATE_CONFERENCE_NAME,
        searchQuery: 'C386519 United',
        searchHeading:
          'C386519 United States. Department of State. Office of International Information',
        // Browse mode configuration - Name-title browse
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
        browseQuery: 'C386519',
        browseHeading: 'C386519 Ortega y Gasset, José, 1883-1955. Espectador. Selections',
        authoritySource: 'LC Name Authority file (LCNAF)',
        personalNameType: 'Personal name',
        marcFile: {
          marc: 'C386519MarcAuth.mrc',
          fileName: `testMarcFile386519.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        createdAuthorityIDs: [],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C386519*');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          // Upload MARC file with 2 authority records:
          // Record 1: Corporate name (110) with 667 field for editing
          // Record 2: Name-title (100) with 670 field for editing
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
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C386519 Switching between Search and Browse in "MARC authority" app (editing record) (spitfire)',
        { tags: ['extendedPath', 'C386519', 'spitfire'] },
        () => {
          // Step 1: Select filter options that will return existing records in Search mode
          MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.searchQuery);
          MarcAuthoritiesSearch.filterByDateCreated(today, today);
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);

          // Step 2: Click "Search" button - verify results are displayed
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Select "Browse" toggle at "Search & filter" pane
          MarcAuthorities.switchToBrowse();
          cy.wait(1000);
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkDefaultBrowseOptions();

          // Step 4-5: Fill browse query and select browse option that will return existing records
          MarcAuthorities.selectSearchOptionInDropdown(testData.browseOption);
          MarcAuthoritiesSearch.fillSearchInput(testData.browseQuery);
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.browseQuery);

          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 6: Click on "Heading/Reference" value for any row in results list
          MarcAuthorities.selectItem(testData.browseHeading);
          MarcAuthority.waitLoading();

          // Step 7: Click "Actions" button in third pane → Select "Edit" option
          MarcAuthority.edit();
          cy.wait(2000);

          // Step 8: Update value in any editable field → Click "Save & close"
          QuickMarcEditor.updateExistingField('670', '$a UPDATED');
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          // Verify state retention after editing in Browse mode
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthority.contains('UPDATED');

          // Step 9: Select "Search" toggle - verify Search state is retained
          MarcAuthorities.switchToSearch();
          cy.wait(1000);
          MarcAuthorities.verifySearchTabIsOpened();

          // Verify Search option/filters/query are the same as at Step 2
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 10: Click on "Heading/Reference" value for any row in results list
          MarcAuthorities.selectItem(testData.searchHeading);
          MarcAuthority.waitLoading();

          // Step 11: Click "Actions" button in third pane → Select "Edit" option
          MarcAuthority.edit();
          cy.wait(2000);

          // Step 12: Update value in any editable field → Click "Save & close"
          QuickMarcEditor.updateExistingField('667', '$a UPDATED');
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          // Verify state retention after editing in Search mode
          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthority.contains('UPDATED');

          // Step 13: Select "Browse" toggle - verify Browse state is retained
          MarcAuthorities.switchToBrowse();
          cy.wait(1000);
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Verify Browse option/filters/query/results are the same as at Step 5
          MarcAuthorities.checkSelectOptionFieldContent(testData.browseOption);
          MarcAuthorities.checkSearchInput(testData.browseQuery);
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 14: Select "Search" toggle - verify Search state is retained again
          MarcAuthorities.switchToSearch();
          cy.wait(1000);
          MarcAuthorities.verifySearchTabIsOpened();

          MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
          MarcAuthorities.checkSearchInput(testData.searchQuery);
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        },
      );
    });
  });
});
