import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { EHOLDINGS_APP_CONTEXT_DROPDOWN_OPTIONS } from '../../support/constants';
import { EHoldingsSearch } from '../../support/fragments/eholdings';
import AppContextDropdown from '../../support/fragments/appContextDropdown';

describe('eHoldings', () => {
  const urlParts = {
    inquiry: 'tfaforms.com',
    status: 'status.ebsco.com',
  };
  let user;

  before('Create user', () => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.eholdingsPath,
        waiter: EHoldingsSearch.waitLoading,
      });
    });
  });

  after('Delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C343241 Access eholdings app menu (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C343241'] },
    () => {
      AppContextDropdown.toggleAppContextDropdown();
      AppContextDropdown.checkAppContextDropdownMenuShown();
      [
        EHOLDINGS_APP_CONTEXT_DROPDOWN_OPTIONS.SEARCH,
        EHOLDINGS_APP_CONTEXT_DROPDOWN_OPTIONS.SHORTCUTS,
      ].forEach((option) => {
        AppContextDropdown.checkOptionInAppContextDropdownMenu(option);
      });

      AppContextDropdown.checkOptionInAppContextDropdownMenu(
        EHOLDINGS_APP_CONTEXT_DROPDOWN_OPTIONS.INQUIRY,
        true,
        {
          checkOpensNewTab: true,
          linkPart: urlParts.inquiry,
        },
      );
      AppContextDropdown.checkOptionInAppContextDropdownMenu(
        EHOLDINGS_APP_CONTEXT_DROPDOWN_OPTIONS.STATUS,
        true,
        {
          checkOpensNewTab: true,
          linkPart: urlParts.status,
        },
      );

      AppContextDropdown.clickOptionInAppContextDropdownMenu(
        EHOLDINGS_APP_CONTEXT_DROPDOWN_OPTIONS.SHORTCUTS,
      );
      AppContextDropdown.verifyKeyboardShortcutsModalShown();
    },
  );
});
