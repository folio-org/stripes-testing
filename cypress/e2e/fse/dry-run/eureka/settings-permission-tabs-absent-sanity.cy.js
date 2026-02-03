import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Eureka', () => {
  describe('Settings', () => {
    const { user, memberTenant } = parseSanityParameters();

    const usersSubTabsPresent = ['Patron groups', 'Owners', 'Conditions'];
    const permissionSetsSubTab = 'Permission sets';
    const usersTabName = 'Users';
    const developerTabName = 'Developer';
    const developerSubTabsPresent = [
      'Configuration',
      'I can haz capabilities?',
      'Stripes inspector',
    ];
    const developerSubTabsAbsent = ['I can haz endpoint?', 'Permissions inspector'];

    before(() => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.settingsUserPath,
        waiter: SettingsPane.waitLoading,
        authRefresh: true,
      });
      cy.allure().logCommandSteps();
    });

    it(
      'C633353 [UID-151] "Permissions" tabs are not shown in Settings > Users, Settings > Developer (eureka)',
      { tags: ['dryRun', 'eureka', 'C633353'] },
      () => {
        usersSubTabsPresent.forEach((presentSubTab) => {
          SettingsPane.checkTabPresentInSecondPane(usersTabName, presentSubTab);
        });
        SettingsPane.checkTabPresentInSecondPane(usersTabName, permissionSetsSubTab, false);

        SettingsPane.selectSettingsTab(developerTabName);
        developerSubTabsPresent.forEach((presentSubTab) => {
          SettingsPane.checkTabPresentInSecondPane(developerTabName, presentSubTab);
        });
        developerSubTabsAbsent.forEach((absentSubTab) => {
          SettingsPane.checkTabPresentInSecondPane(developerTabName, absentSubTab, false);
        });
      },
    );
  });
});
