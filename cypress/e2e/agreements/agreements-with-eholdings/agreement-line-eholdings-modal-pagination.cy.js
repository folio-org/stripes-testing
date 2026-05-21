import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import NewAgreementLine from '../../../support/fragments/agreements/newAgreementLine';
import SelectEHoldingsModal from '../../../support/fragments/agreements/modals/selectEHoldingsModal';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SearchAndFilterAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';

describe('Agreements', () => {
  describe('Agreements with eHoldings', () => {
    const testData = {
      sortOption: 'Title',
      searchQuery: 'wiley',
    };

    before(() => {
      cy.getAdminToken();
      Agreements.createViaApi().then((agreement) => {
        testData.agreementId = agreement.id;
        testData.agreementName = agreement.name;
      });
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsAgreementsEdit.gui,
        Permissions.uiAgreementsSearchAndView.gui,
      ]).then((createdUserProperties) => {
        testData.user = createdUserProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.agreementsPath,
          waiter: Agreements.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Agreements.deleteViaApi(testData.agreementId);
    });

    it(
      'C350959 [Titles] Previous / next pagination of search result list (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350959'] },
      () => {
        // Step 1: Open agreement and navigate to Agreement Lines accordion
        SearchAndFilterAgreements.search(testData.agreementName);
        Agreements.selectRecord(testData.agreementName);
        AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
          Agreements.defaultAgreement.name,
        );
        AgreementViewDetails.openAgreementLineSection();
        AgreementViewDetails.clickActionsForAgreementLines();
        AgreementViewDetails.clickNewAgreementLine();
        NewAgreementLine.waitLoading();

        // Step 2: Click on "eHoldings" tab and select "Link e-resource"
        NewAgreementLine.clickEHoldingsTab();
        NewAgreementLine.clickLinkEResource();

        // Step 3: Click on "Titles" toggle in the "Search & filter" pane
        SelectEHoldingsModal.clickTitlesToggle();

        // Step 4: Fill in search box with query and click "Search"
        SelectEHoldingsModal.searchForTitleOrPackage(testData.searchQuery);

        // Step 5: Click "Sort options" accordion and select "Title" radio button
        SelectEHoldingsModal.sortRecords(testData.sortOption);
        SelectEHoldingsModal.checkAllValuesInColumnSorted(1);

        // Step 6: Scroll to the end of result list and verify pagination button states
        // "< Previous" button is disabled, "Next >" button is enabled
        SelectEHoldingsModal.verifyPreviousPageButtonEnabled(false);
        SelectEHoldingsModal.verifyNextPageButtonEnabled();

        // Step 7: Click "Next >" button
        SelectEHoldingsModal.clickNextPageButton();
        // Verify the next page with results is displayed
        // Verify the first record from the result list is highlighted (focus)
        SelectEHoldingsModal.verifyResultIsFocused(25);

        // Step 8: Press "Tab" keyboard button
        // Verify the highlighting (focus) is moved to the next record
        cy.focused().tab();
        SelectEHoldingsModal.verifyResultIsFocused(26);

        // Step 9: Scroll to the end and verify pagination button states
        // "< Previous" button is enabled, "Next >" button is enabled
        SelectEHoldingsModal.verifyPreviousPageButtonEnabled();
        SelectEHoldingsModal.verifyNextPageButtonEnabled();

        // Step 10: Click "< Previous" button
        SelectEHoldingsModal.clickPreviousPageButton();
        // Verify the previous page with results is displayed
        // Verify the first record from the result list is highlighted (focus)
        SelectEHoldingsModal.verifyResultIsFocused();

        // Step 11: Press "Tab" keyboard button
        // Verify the highlighting (focus) is moved to the next record
        cy.focused().tab();
        SelectEHoldingsModal.verifyResultIsFocused(1);
        SelectEHoldingsModal.getRecordTitle(1).then((highlightedTitle) => {
          // Step 12: Press "Enter" keyboard button
          // Verify "Select package" modal window is closed
          // Verify the highlighted "Title" record is linked and displayed in the new Agreement line
          cy.focused().type('{enter}');
          SelectEHoldingsModal.verifySelectPackageModalIsClosed();
          NewAgreementLine.verifyLinkedEResourceIsDisplayed(highlightedTitle);
        });
      },
    );
  });
});
