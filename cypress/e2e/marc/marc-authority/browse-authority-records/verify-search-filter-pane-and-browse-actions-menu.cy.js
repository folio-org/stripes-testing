import {
  MARC_AUTHORITY_BROWSE_OPTIONS,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const naturalId = `350512${randomNDigitNumber(15)}`;
      const titlePrefix = 'AT_C350512_MarcAuthority_';
      // A single record with both a "100" (Authorized heading) and a "400" (see-from reference)
      // produces two Browse rows for one record - an "Authorized" row and a "Reference" row -
      // guaranteeing the mix the "Exclude see from" checks (steps 12/14/15) need
      const authorizedHeading = `${titlePrefix}${randomPostfix}`;
      const referenceHeading = `${titlePrefix}_Ref_${randomPostfix}`;
      const browseOption = MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME;
      const showColumnsOptions = [
        'Authorized/Reference',
        'Type of heading',
        'Authority source',
        'Number of titles',
      ];
      const authoritySourceAccordionName = 'Authority source';
      const referencesAccordionName = 'References';
      const typeOfHeadingAccordionName = 'Type of heading';

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ];

      let user;
      let createdAuthorityId;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(titlePrefix);

        MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
          { tag: '100', content: `$a ${authorizedHeading}`, indicators: ['1', '\\'] },
          { tag: '400', content: `$a ${referenceHeading}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          createdAuthorityId = id;
        });

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.switchToBrowse();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(user.userId);
      });

      // Will FAIL until this is fixed: https://folio-org.atlassian.net/browse/UIMARCAUTH-557
      it(
        'C350512 Verify "Search & filter" pane and browse result form ("Actions" menu) (promin)',
        { tags: ['extendedPath', 'promin', 'C350512'] },
        () => {
          // Step 1: Default "Search & filter" pane state in Browse mode
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorities.checkDefaultBrowseOptions();
          MarcAuthorities.checkSearchButtonDisabled(true);
          MarcAuthorities.checkResetAllButtonDisabled(true);
          MarcAuthorities.verifyAccordionOpenState(authoritySourceAccordionName, true);
          MarcAuthorities.verifyAccordionOpenState(referencesAccordionName, false);
          MarcAuthorities.verifyAccordionOpenState(typeOfHeadingAccordionName, false);

          // Step 2: "Actions" menu - "New" enabled, "Export selected records" disabled
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.checkButtonNewExistsInActionDropdown(true);
          MarcAuthorities.verifyActionsMenuBrowse({ exportEnabled: false });

          // Step 3: Fill in the browse query - "Search" still disabled, "Reset all" enabled
          MarcAuthoritiesSearch.fillSearchInput(authorizedHeading);
          MarcAuthorities.checkSearchButtonDisabled(true);
          MarcAuthorities.checkResetAllButtonDisabled(false);

          // Step 4: Enter key doesn't start the search
          MarcAuthoritiesSearch.focusOnSearchBox();
          MarcAuthorities.activateFocusedElementWithEnter();
          cy.wait(1000);
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);

          // Step 5: Select a browse option - "Search" button becomes enabled
          MarcAuthorities.selectSearchOptionInDropdown(browseOption);
          MarcAuthorities.checkSelectOptionFieldContent(browseOption);
          MarcAuthorities.checkSearchButtonDisabled(false);

          // Step 6: Run the browse search - results shown with all 5 columns
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkPaginationButtonsShown();
          MarcAuthorities.checkRecordInBold(authorizedHeading);

          // Step 7-8: Results pane header shows Actions button - menu is unchanged
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.checkButtonNewExistsInActionDropdown(true);
          MarcAuthorities.verifyActionsMenuBrowse({ exportEnabled: false });

          // Step 9: Uncheck all "Show columns" checkboxes one by one - columns disappear
          showColumnsOptions.forEach((column) => {
            MarcAuthorities.setActionsCheckboxState(column, false);
            MarcAuthorities.checkColumnAbsent(column);
          });
          MarcAuthorities.clickActionsButton();

          // Step 10: "Previous" - only run/verify if the button is actually enabled
          MarcAuthorities.getPreviousPaginationButtonState().then((previousEnabled) => {
            if (previousEnabled) {
              MarcAuthorities.clickPreviousPagination();
              MarcAuthorities.verifySearchResultTabletIsAbsent(false);
              showColumnsOptions.forEach((column) => {
                MarcAuthorities.checkColumnAbsent(column);
              });

              // Step 11: "Next" - only run/verify if the button is actually enabled
              MarcAuthorities.getNextPaginationButtonState().then((nextEnabled) => {
                if (nextEnabled) {
                  MarcAuthorities.clickNextPagination();
                  MarcAuthorities.verifySearchResultTabletIsAbsent(false);
                  showColumnsOptions.forEach((column) => {
                    MarcAuthorities.checkColumnAbsent(column);
                  });
                }
              });
            }
          });

          // Step 12: "References" accordion shows "Exclude see from" - columns still hidden
          MarcAuthorities.clickAccordionByName(referencesAccordionName);
          MarcAuthorities.verifyCheckboxInAccordion(
            referencesAccordionName,
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          showColumnsOptions.forEach((column) => {
            MarcAuthorities.checkColumnAbsent(column);
          });

          // Step 13: Re-check all "Show columns" checkboxes one by one - columns reappear
          MarcAuthorities.clickActionsButton();
          showColumnsOptions.forEach((column) => {
            MarcAuthorities.setActionsCheckboxState(column, true);
            MarcAuthorities.checkColumnExists(column);
          });

          // Step 14: Check "Exclude see from" - only "Authorized" records remain
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyRecordFound(referenceHeading, false, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(authorizedHeading, true, { partialMatch: true });
          // Step 15: Uncheck "Exclude see from" - "Authorized" and "Reference" both shown again
          MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyRecordFound(referenceHeading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(authorizedHeading, true, { partialMatch: true });
        },
      );
    });
  });
});
