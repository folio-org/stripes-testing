import { APPLICATION_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import HridHandling from '../../../support/fragments/settings/inventory/instance-holdings-item/hridHandling';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    let user;

    before('Create user and open Settings app', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          user.userId,
          [],
          [CapabilitySets.uiInventorySettingsListView],
        );

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C499880 Check that "Settings (Inventory): View list of settings pages" allows user to view the HRID handlings for Inventory (folijet)',
      { tags: ['extendedPath', 'folijet', 'C499880'] },
      () => {
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.validateSettingsTab({
          name: INVENTORY_SETTINGS_TABS.HRID_HANDLING,
          isPresent: true,
        });
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HRID_HANDLING);

        HridHandling.waitloading();
        HridHandling.verifyHridHandlingFieldsDisabled();
      },
    );
  });
});
