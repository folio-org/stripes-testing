import CapabilitySets from '../../../support/dictionary/capabilitySets';
import AuthorityHotkeys from '../../../support/fragments/marcAuthority/authorityHotkeys';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      authorityHeading: `AT_C1385638_MarcAuthority${getRandomPostfix()}`,
      browseSearchTerm: 'AT_C1385638',
      searchSegmentId: 'segment-navigation-search',
      browseSegmentId: 'segment-navigation-browse',
      searchBrowseInputId: 'textarea-authorities-search',
      advancedSearchButtonText: 'Advanced search',
      resetAllButtonText: 'Reset all',
    };

    // Predicates for the elements this test needs to Tab onto - matched by stable id (toggle
    // segments) or visible text (buttons, since they don't carry a stable id/aria-label here)
    const isSearchSegment = ($el) => $el.attr('id') === testData.searchSegmentId;
    const isBrowseSegment = ($el) => $el.attr('id') === testData.browseSegmentId;
    const isSearchBrowseInput = ($el) => $el.attr('id') === testData.searchBrowseInputId;
    const isAdvancedSearchButton = ($el) => $el.text().trim() === testData.advancedSearchButtonText;
    const isResetAllButton = ($el) => $el.text().trim() === testData.resetAllButtonText;

    let user;
    let createdAuthorityId;

    before('Create test data', () => {
      cy.getAdminToken();

      MarcAuthorities.createMarcAuthorityViaAPI('', getRandomPostfix(), [
        { tag: '100', content: `$a ${testData.authorityHeading}`, indicators: ['1', '\\'] },
      ]).then((id) => {
        createdAuthorityId = id;
      });

      cy.createTempUser([]).then((createdUserProperties) => {
        user = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [],
          [CapabilitySets.uiMarcAuthoritiesAuthorityRecordView],
        );

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
    });

    it(
      'C1385638 User can activate the MARC authority Browse toggle, Advanced search, and Reset all buttons using the Enter key (promin)',
      { tags: ['extendedPath', 'promin', 'C1385638'] },
      () => {
        // Step 1: "Search & filter" pane default state
        MarcAuthorities.verifySearchTabIsOpened();
        MarcAuthorities.checkSearchInputInFocus();
        MarcAuthorities.checkSearchButtonDisabled(true);
        MarcAuthorities.checkResetAllButtonDisabled(true);

        // Step 2: Tab from the search box until focus lands on the "Browse" segment
        MarcAuthorities.pressTabUntilFocused(isBrowseSegment);
        cy.focused().should('have.id', testData.browseSegmentId);
        MarcAuthorities.verifySearchTabIsOpened();

        // Step 3: Enter activates the "Browse" segment
        MarcAuthorities.activateFocusedElementWithEnter();
        MarcAuthorities.verifyBrowseTabIsOpened();

        // Step 4: Type query, Tab to "Reset all", Enter resets the search
        cy.focused().should('have.id', testData.searchBrowseInputId);
        cy.focused().type(testData.browseSearchTerm);
        MarcAuthorities.pressTabUntilFocused(isResetAllButton);
        cy.focused().should('have.text', testData.resetAllButtonText);
        MarcAuthorities.activateFocusedElementWithEnter();
        MarcAuthorities.checkSearchInputIsEmpty();
        MarcAuthorities.checkResetAllButtonDisabled(true);

        // Step 5: Shift+Tab back to the "Search" segment, Enter switches back to Search
        MarcAuthorities.pressTabUntilFocused(isSearchSegment, { shift: true });
        cy.focused().should('have.id', testData.searchSegmentId);
        MarcAuthorities.activateFocusedElementWithEnter();
        MarcAuthorities.verifySearchTabIsOpened();

        // Step 6: Tab to "Advanced search", Enter opens the modal, Esc closes it
        MarcAuthorities.pressTabUntilFocused(isAdvancedSearchButton);
        cy.focused().should('have.text', testData.advancedSearchButtonText);
        MarcAuthorities.activateFocusedElementWithEnter();
        MarcAuthorities.checkAdvancedSearchModalExists();
        AuthorityHotkeys.pressHotKey(AuthorityHotkeys.close);
        MarcAuthorities.checkAdvancedSearchModalAbsence();

        // Step 7: Type query in the search box, Tab to "Reset all", Enter resets the search
        MarcAuthorities.pressTabUntilFocused(isSearchBrowseInput);
        cy.focused().should('have.id', testData.searchBrowseInputId);
        cy.focused().type(testData.browseSearchTerm);
        MarcAuthorities.pressTabUntilFocused(isResetAllButton);
        MarcAuthorities.activateFocusedElementWithEnter();
        MarcAuthorities.checkSearchInputIsEmpty();
        MarcAuthorities.checkResetAllButtonDisabled(true);

        // Step 8: Spacebar on the "Browse" segment behaves the same as Enter
        MarcAuthorities.pressTabUntilFocused(isBrowseSegment, { shift: true });
        MarcAuthorities.activateFocusedElementWithSpace();
        MarcAuthorities.verifyBrowseTabIsOpened();

        // Step 9: Spacebar on the "Search" segment behaves the same as Enter
        MarcAuthorities.pressTabUntilFocused(isSearchSegment, { shift: true });
        MarcAuthorities.activateFocusedElementWithSpace();
        MarcAuthorities.verifySearchTabIsOpened();

        // Step 10: Spacebar on "Advanced search" and "Reset all" both behave the same as Enter
        MarcAuthorities.pressTabUntilFocused(isAdvancedSearchButton);
        MarcAuthorities.activateFocusedElementWithSpace();
        MarcAuthorities.checkAdvancedSearchModalExists();
        AuthorityHotkeys.pressHotKey(AuthorityHotkeys.close);
        MarcAuthorities.checkAdvancedSearchModalAbsence();

        MarcAuthorities.pressTabUntilFocused(isSearchBrowseInput);
        cy.focused().should('have.id', testData.searchBrowseInputId);
        cy.focused().type(testData.browseSearchTerm);
        MarcAuthorities.pressTabUntilFocused(isResetAllButton);
        MarcAuthorities.activateFocusedElementWithSpace();
        MarcAuthorities.checkSearchInputIsEmpty();
        MarcAuthorities.checkResetAllButtonDisabled(true);
      },
    );
  });
});
