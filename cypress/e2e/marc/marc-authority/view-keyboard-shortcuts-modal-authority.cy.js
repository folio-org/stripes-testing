import TopMenu from '../../../support/fragments/topMenu';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import AppContextDropdown from '../../../support/fragments/appContextDropdown';
import { AUTHORITY_APP_CONTEXT_DROPDOWN_OPTIONS } from '../../../support/constants';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import AuthorityHokeys, {
  shortcutList,
} from '../../../support/fragments/marcAuthority/authorityHotkeys';

describe('MARC', () => {
  describe('MARC authority', () => {
    let userId;

    before('Create user, login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (userProperties) => {
          userId = userProperties.userId;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        },
      );
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C466258 View "Keyboard shortcut" pop-up modal window in "MARC authority" app (Windows) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466258'] },
      () => {
        AppContextDropdown.verifyInventoryDropdownIsShown(false);
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        Object.values(AUTHORITY_APP_CONTEXT_DROPDOWN_OPTIONS).forEach((option) => {
          AppContextDropdown.checkOptionInAppContextDropdownMenu(option);
        });

        AppContextDropdown.clickOptionInAppContextDropdownMenu(
          AUTHORITY_APP_CONTEXT_DROPDOWN_OPTIONS.SHORTCUTS,
        );
        AppContextDropdown.checkAppContextDropdownMenuShown(false);
        AppContextDropdown.verifyKeyboardShortcutsModalShown();
        AppContextDropdown.verifyShortcutsModalContent(shortcutList);

        AppContextDropdown.closeShortcutsViaIcon();
        AppContextDropdown.verifyKeyboardShortcutsModalShown(false);

        AuthorityHokeys.pressHotKey(AuthorityHokeys.openShortcutsModal);
        AppContextDropdown.checkAppContextDropdownMenuShown(false);
        AppContextDropdown.verifyKeyboardShortcutsModalShown();
        AppContextDropdown.verifyShortcutsModalContent(shortcutList);
      },
    );
  });
});
