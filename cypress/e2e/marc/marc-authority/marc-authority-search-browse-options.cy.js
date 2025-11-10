import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../support/constants';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC', () => {
  describe('MARC authority', () => {
    let user;

    before('Creating user', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          user = createdUserProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        },
      );
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C422022 Verify Search / Browse option dropdowns in "MARC authority" app (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422022'] },
      () => {
        MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD);
        MarcAuthorities.checkSearchOptionsInDropdownInOrder();

        MarcAuthorities.switchToBrowse();
        MarcAuthorities.verifyBrowseTabIsOpened();

        MarcAuthorityBrowse.checkFiltersInitialState();
        MarcAuthorities.checkBrowseOptionsInDropdownInOrder();
      },
    );
  });
});
