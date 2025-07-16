import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { APPLICATION_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import {
  CallNumberTypes,
  CALL_NUMBER_TYPES_DEFAULT,
} from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        localCallNumberTypeName: `AT_C627456_CallNumberType_${randomPostfix}`,
      };
      let user;

      before('Create user, login', () => {
        cy.getAdminToken();
        CallNumberTypes.deleteCallNumberTypesLike('C627456');
        cy.createTempUser([Permissions.uiSettingsCallNumberBrowseView.gui]).then(
          (userProperties) => {
            user = userProperties;

            CallNumberTypes.createCallNumberTypeViaApi({
              name: testData.localCallNumberTypeName,
            }).then((id) => {
              testData.callNumberTypeId = id;

              cy.login(user.username, user.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
              TopMenuNavigation.navigateToApp(
                APPLICATION_NAMES.SETTINGS,
                APPLICATION_NAMES.INVENTORY,
              );
              CallNumberBrowseSettings.openCallNumberBrowse();
              CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();
            });
          },
        );
      });

      after('Delete user', () => {
        cy.getAdminToken();
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.callNumberTypeId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C627456 All available "Call number types" are displayed in "Call number types" multi-select dropdown for each "Call number browse" option on "Call number browse" pane. (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C627456'] },
        () => {
          Object.values(BROWSE_CALL_NUMBER_OPTIONS).forEach((browseOption) => {
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
            cy.wait(500);
            [...Object.values(CALL_NUMBER_TYPES_DEFAULT), testData.localCallNumberTypeName].forEach(
              (expectedType) => {
                CallNumberBrowseSettings.validateAvailableCallNumberTypeOption(expectedType);
              },
            );
            if (browseOption) {
              CallNumberBrowseSettings.clearAllSelectedCallNumberTypes(browseOption);
            }
            CallNumberBrowseSettings.selectCallNumberTypeDropdownOption(
              testData.localCallNumberTypeName,
            );
            CallNumberBrowseSettings.validateCallNumberTypesDropdownExpanded(browseOption);
            CallNumberBrowseSettings.validateSaveButtonStatusForItem({
              itemName: browseOption,
              isEnabled: true,
            });
            CallNumberBrowseSettings.validateOptionSelectedInCallNumberTypesDropdown(
              browseOption,
              testData.localCallNumberTypeName,
            );
            CallNumberBrowseSettings.clickCancelButtonForItem(browseOption);
            CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
              browseOption,
              testData.localCallNumberTypeName,
              false,
            );
          });
        },
      );
    });
  });
});
