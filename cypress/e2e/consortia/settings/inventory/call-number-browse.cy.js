import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      describe('Consortia', () => {
        let user;

        const permissions = [Permissions.uiSettingsCallNumberBrowseView.gui];
        const callNumberBrowseOptionCentral = 'Call numbers (all)';
        const callNumberTypeCentral = 'Dewey Decimal classification';
        const callNumberBrowseOptionMember = 'Library of Congress classification';
        const callNumberTypeMember = 'Dewey Decimal classification';

        before('Create user, login', () => {
          cy.getAdminToken();
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: callNumberBrowseOptionCentral,
            callNumberTypes: [],
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: callNumberBrowseOptionMember,
            callNumberTypes: [],
          });
          cy.createTempUser(permissions).then((userProperties) => {
            user = userProperties;
            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: user.userId,
              permissions,
            });

            cy.login(user.username, user.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            CallNumberBrowseSettings.openCallNumberBrowse();
            CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();
          });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
        });

        it(
          'C627461 Edit "Call number browse" option from Central/Member tenants (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C627461'] },
          () => {
            CallNumberBrowseSettings.clickEditButtonForItem(callNumberBrowseOptionCentral);
            CallNumberBrowseSettings.validateSaveButtonStatusForItem({
              itemName: callNumberBrowseOptionCentral,
              isEnabled: false,
            });
            CallNumberBrowseSettings.validateCancelButtonStatusForItem({
              itemName: callNumberBrowseOptionCentral,
              isEnabled: true,
            });
            CallNumberBrowseSettings.expandCallNumberTypeDropdownOption(
              callNumberBrowseOptionCentral,
            );
            CallNumberBrowseSettings.validateCallNumberTypesDropdownExpanded(
              callNumberBrowseOptionCentral,
            );
            cy.wait(500);
            CallNumberBrowseSettings.selectCallNumberTypeDropdownOption(callNumberTypeCentral);
            CallNumberBrowseSettings.validateCallNumberTypesDropdownExpanded(
              callNumberBrowseOptionCentral,
            );
            CallNumberBrowseSettings.validateSaveButtonStatusForItem({
              itemName: callNumberBrowseOptionCentral,
              isEnabled: true,
            });
            CallNumberBrowseSettings.validateOptionSelectedInCallNumberTypesDropdown(
              callNumberBrowseOptionCentral,
              callNumberTypeCentral,
            );

            CallNumberBrowseSettings.clickSaveButtonForItem(callNumberBrowseOptionCentral);
            CallNumberBrowseSettings.validateCallNumberUpdateMessageSuccess(
              callNumberBrowseOptionCentral,
            );
            CallNumberBrowseSettings.validateEditButtonForItemExists(callNumberBrowseOptionCentral);
            CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
              callNumberBrowseOptionCentral,
              callNumberTypeCentral,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            CallNumberBrowseSettings.openCallNumberBrowse();
            CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();
            CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
              callNumberBrowseOptionCentral,
              callNumberTypeCentral,
            );
            CallNumberBrowseSettings.setCallNumberTypeOptions(callNumberBrowseOptionMember, [
              callNumberTypeMember,
            ]);
            CallNumberBrowseSettings.validateCallNumberUpdateMessageSuccess(
              callNumberBrowseOptionMember,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            CallNumberBrowseSettings.openCallNumberBrowse();
            CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();
            CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
              callNumberBrowseOptionCentral,
              callNumberTypeCentral,
            );
            CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
              callNumberBrowseOptionMember,
              callNumberTypeMember,
            );
          },
        );
      });
    });
  });
});
