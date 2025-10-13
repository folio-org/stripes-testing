import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  ADVANCED_SEARCH_MODIFIERS,
} from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        searchQuery: 'C710368 query',
        booleanOr: 'OR',
        booleanAnd: 'AND',
      };

      const noResultsMessage = `keyword containsAll ${testData.searchQuery} or personalNameTitle exactPhrase ${testData.searchQuery}`;

      before(() => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C710368 MARC authority | Use "Reset all" in "Advanced search" modal (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C710368'] },
        () => {
          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );

          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.searchQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled();
          MarcAuthorities.focusOnAdvancedSearchField(0);
          MarcAuthorities.verifyClearIconInAdvancedSearchField(0);

          MarcAuthorities.clickClearIconInAdvancedSearchField(0);
          MarcAuthorities.verifyClearIconInAdvancedSearchField(0, false);
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );

          MarcAuthorities.fillAdvancedSearchField(
            1,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanOr,
          );
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled();
          MarcAuthorities.clickResetAllButtonInAdvSearchModal();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanAnd,
          );

          MarcAuthorities.fillAdvancedSearchField(
            2,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanAnd,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          );
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled();
          MarcAuthorities.clickResetAllButtonInAdvSearchModal();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            2,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanAnd,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          );

          MarcAuthorities.fillAdvancedSearchField(
            3,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
          );
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled();
          MarcAuthorities.clickResetAllButtonInAdvSearchModal();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            3,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanAnd,
          );

          MarcAuthorities.fillAdvancedSearchField(
            4,
            testData.searchQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            testData.booleanOr,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          );
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled();
          MarcAuthorities.clickResetAllButtonInAdvSearchModal();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            4,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanAnd,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          );

          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.searchQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.searchQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            testData.booleanOr,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          );
          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.verifyEmptySearchResults(noResultsMessage);

          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled();
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            testData.searchQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            testData.booleanOr,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          );
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled();
          MarcAuthorities.clickResetAllButtonInAdvSearchModal();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanAnd,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          );
          MarcAuthorities.verifyEmptySearchResults(noResultsMessage);

          MarcAuthorities.fillAdvancedSearchField(
            0,
            testData.searchQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );
          MarcAuthorities.fillAdvancedSearchField(
            1,
            testData.searchQuery,
            MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
            testData.booleanOr,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          );
          cy.get('#advanced-search-modal').type('{enter}');
          MarcAuthorities.checkAdvancedSearchModalAbsence();
          MarcAuthorities.verifyEmptySearchResults(noResultsMessage);

          MarcAuthorities.clickResetAndCheck();

          MarcAuthorities.clickAdvancedSearchButton();
          MarcAuthorities.checkResetAllButtonInAdvSearchModalEnabled(false);
          MarcAuthorities.checkAdvancedSearchModalFields(
            0,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          );
          MarcAuthorities.checkAdvancedSearchModalFields(
            1,
            '',
            MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
            testData.booleanAnd,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
          );
        },
      );
    });
  });
});
