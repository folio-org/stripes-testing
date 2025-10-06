import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const user = {};
    const searchOption = '*';

    before('Creating user', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          user.userProperties = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.userProperties.username, user.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        },
      );
      MarcAuthorities.switchToSearch();
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
    });

    it(
      'C422026 Verify that clicking on "Reset all" button will return focus and cursor to the Search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422026'] },
      () => {
        MarcAuthorities.searchBeats(searchOption);
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);
        MarcAuthorities.checkResetAllButtonDisabled(false);
        MarcAuthorities.clickResetAndCheck(searchOption);
        MarcAuthorities.verifySearchResultTabletIsAbsent(true);
        MarcAuthorities.checkResetAllButtonDisabled();
        MarcAuthorities.checkSearchInputInFocus();
      },
    );
  });
});
