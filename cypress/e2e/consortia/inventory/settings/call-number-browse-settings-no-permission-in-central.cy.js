import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import { APPLICATION_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number Browse', () => {
      describe('Consortia', () => {
        const callNumberTypesOption = 'Call number types';
        const callNumberBrowseOption = 'Call number browse';
        const sectionName = 'Holdings, Items';
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui]).then(
            (userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiSettingsCallNumberBrowseView.gui,
              ]);

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
              SettingsPane.selectSettingsTab(APPLICATION_NAMES.INVENTORY);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C627463 User without permission on Central tenant cannot see "Call number browse" pane from Member tenant when he has permission on Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C627463'] },
          () => {
            SettingsPane.checkOptionInSecondPaneExists(callNumberTypesOption);
            SettingsPane.checkOptionInSecondPaneExists(callNumberBrowseOption, false);
            SettingsPane.verifyTabsCountInSection(sectionName, 1);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(APPLICATION_NAMES.INVENTORY);
            SettingsPane.checkOptionInSecondPaneExists(callNumberTypesOption, false);
            SettingsPane.checkOptionInSecondPaneExists(callNumberBrowseOption, false);
            SettingsPane.verifyTabsCountInSection(sectionName, 0);
          },
        );
      });
    });
  });
});
