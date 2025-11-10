import {
  AUTHORITY_APP_CONTEXT_DROPDOWN_OPTIONS,
  INVENTORY_APP_CONTEXT_DROPDOWN_OPTIONS,
  APPLICATION_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import AppContextDropdown from '../../../support/fragments/appContextDropdown';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC authority', () => {
    let user;

    before('Creating user', () => {
      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.inventoryAll.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375128 App context dropdown menu closes when navigating to another app (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C375128'] },
      () => {
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        AppContextDropdown.checkOptionInAppContextDropdownMenu(
          AUTHORITY_APP_CONTEXT_DROPDOWN_OPTIONS.SEARCH,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();

        AppContextDropdown.checkAppContextDropdownMenuShown(false);
        AppContextDropdown.toggleAppContextDropdown();
        AppContextDropdown.checkAppContextDropdownMenuShown();
        AppContextDropdown.checkOptionInAppContextDropdownMenu(
          INVENTORY_APP_CONTEXT_DROPDOWN_OPTIONS.SEARCH,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();

        AppContextDropdown.checkAppContextDropdownMenuShown(false);
      },
    );
  });
});
