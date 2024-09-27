import SettingsPane from '../../../support/fragments/settings/settingsPane';
import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';
import TopMenu from '../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Settings', () => {
    const tabsPresent = ['Patron groups', 'Owners', 'Conditions'];
    const permissionSetsTab = 'Permission sets';

    before(() => {
      cy.loginAsAdmin({
        path: TopMenu.settingsUserPath,
        waiter: SettingsPane.waitLoading,
      });
    });

    it(
      'C468196 "Permission sets" tab is NOT shown in "Settings" -> "Users" (eureka)',
      { tags: ['smoke', 'eureka', 'eurekaPhase1'] },
      () => {
        tabsPresent.forEach((presentTab) => {
          UsersSettingsGeneral.checkUsersPaneTabPresent(presentTab);
        });
        UsersSettingsGeneral.checkUsersPaneTabPresent(permissionSetsTab, false);
      },
    );
  });
});
