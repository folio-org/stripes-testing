import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { APPLICATION_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      describe('Consortia', () => {
        const browseOption = BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS;
        const selectedCallNumberType = 'Dewey Decimal classification';
        const callNumberBrowseTab = 'Call number browse';
        const saveCalloutText = `The call number browse type ${browseOption} was successfully updated`;
        let user;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: browseOption,
            callNumberTypes: [],
          });
          cy.createTempUser([Permissions.uiSettingsCallNumberBrowseView.gui]).then(
            (userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
              ]);

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
              TopMenuNavigation.navigateToApp(
                APPLICATION_NAMES.SETTINGS,
                APPLICATION_NAMES.INVENTORY,
              );
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              CallNumberBrowseSettings.openCallNumberBrowse();
              CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: browseOption,
            callNumberTypes: [],
          });
          Users.deleteViaApi(user.userId);
        });

        it(
          'C627462 "Call number browse" pane is not displayed on Member tenant when user has only "Call number types" permission on Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C627462'] },
          () => {
            CallNumberBrowseSettings.clickEditButtonForItem(browseOption);
            CallNumberBrowseSettings.validateSaveButtonStatusForItem({
              itemName: browseOption,
              isEnabled: false,
            });
            CallNumberBrowseSettings.validateCancelButtonStatusForItem({
              itemName: browseOption,
              isEnabled: true,
            });

            CallNumberBrowseSettings.expandCallNumberTypeDropdownOption(browseOption);
            CallNumberBrowseSettings.validateCallNumberTypesDropdownExpanded(browseOption);
            CallNumberBrowseSettings.selectCallNumberTypeDropdownOption(selectedCallNumberType);
            CallNumberBrowseSettings.validateOptionSelectedInCallNumberTypesDropdown(
              browseOption,
              selectedCallNumberType,
            );
            CallNumberBrowseSettings.validateCallNumberTypesDropdownExpanded(browseOption);
            CallNumberBrowseSettings.validateSaveButtonStatusForItem({
              itemName: browseOption,
              isEnabled: true,
            });

            CallNumberBrowseSettings.clickSaveButtonForItem(browseOption);
            InteractorsTools.checkCalloutMessage(saveCalloutText);
            CallNumberBrowseSettings.validateEditButtonForItemExists(browseOption);
            CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
              browseOption,
              selectedCallNumberType,
              true,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(APPLICATION_NAMES.INVENTORY);
            SettingsPane.checkOptionInSecondPaneExists(callNumberBrowseTab, false);
          },
        );
      });
    });
  });
});
