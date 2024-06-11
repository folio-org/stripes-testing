import UsersSettingsGeneral from '../../../support/fragments/settings/users/usersSettingsGeneral';
import TopMenu from '../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Settings', () => {
    const tabsPresent = ['Patron groups', 'Owners', 'Conditions'];
    const permissionSetsTab = 'Permission sets';

    before(() => {
      cy.loginAsAdmin();
    });

    it(
      'C468196 "Permission sets" tab is NOT shown in "Settings" -> "Users" (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
      () => {
        cy.visit(TopMenu.settingsUserPath);
        tabsPresent.forEach((presentTab) => {
          UsersSettingsGeneral.checkUsersPaneTabPresent(presentTab);
        });
        UsersSettingsGeneral.checkUsersPaneTabPresent(permissionSetsTab, false);
      },
    );
  });
});
