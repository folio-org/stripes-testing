import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import { CALL_NUMBER_TYPES_DEFAULT } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      let user;

      const testData = {
        localCallNumberTypeName: `AT_C627460_LocalCNType_${getRandomPostfix()}`,
        callNumberBrowseOption: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        preSelectedCallNumberTypes: [
          CALL_NUMBER_TYPES_DEFAULT.DEWEY_DECIMAL_CLASSIFICATION,
          CALL_NUMBER_TYPES_DEFAULT.LIBRARY_OF_CONGRESS_CLASSIFICATION,
        ],
      };
      const saveCalloutText = `The call number browse type ${testData.callNumberBrowseOption} was successfully updated`;

      before('Create test data', () => {
        cy.getAdminToken();

        // Set up call number browse settings with pre-selected types
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: testData.callNumberBrowseOption,
          callNumberTypes: testData.preSelectedCallNumberTypes,
        });

        cy.createTempUser([Permissions.uiSettingsCallNumberBrowseView.gui]).then(
          (userProperties) => {
            user = userProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            });
            CallNumberBrowseSettings.openCallNumberBrowse();
            CallNumberBrowseSettings.validateCallNumberBrowsePaneOpened();
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        // Reset call number browse settings
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: testData.callNumberBrowseOption,
          callNumberTypes: [],
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C627460 Delete already selected "Call number type" when edit "Call number browse" option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C627460'] },
        () => {
          // Verify that the browse option has pre-selected call number types
          CallNumberBrowseSettings.validateMultipleTypesForCallNumberBrowseRowInTable(
            testData.callNumberBrowseOption,
            testData.preSelectedCallNumberTypes,
            true,
          );

          // Step 1: Click on the "Edit" (pencil) icon next to Call number browse option which has selected "Call number types"
          CallNumberBrowseSettings.clickEditButtonForItem(testData.callNumberBrowseOption);

          // Verify enabled multi-select dropdown element with already selected "Call number types" option is displayed
          CallNumberBrowseSettings.validateOptionSelectedInCallNumberTypesDropdown(
            testData.callNumberBrowseOption,
            testData.preSelectedCallNumberTypes,
          );

          // Verify enabled "Cancel" button is displayed in the "Actions" column
          CallNumberBrowseSettings.validateCancelButtonStatusForItem({
            itemName: testData.callNumberBrowseOption,
            isEnabled: true,
          });

          // Verify disabled "Save" button is displayed in the "Actions" column
          CallNumberBrowseSettings.validateSaveButtonStatusForItem({
            itemName: testData.callNumberBrowseOption,
            isEnabled: false,
          });

          // Step 2: Delete all already selected "Call number types" options from multi-select element
          CallNumberBrowseSettings.clearAllSelectedCallNumberTypes(testData.callNumberBrowseOption);

          // Verify input field of multi-select dropdown is empty
          CallNumberBrowseSettings.validateOptionSelectedInCallNumberTypesDropdown(
            testData.callNumberBrowseOption,
            [],
          );

          // Verify "Save" button became enabled
          CallNumberBrowseSettings.validateSaveButtonStatusForItem({
            itemName: testData.callNumberBrowseOption,
            isEnabled: true,
          });

          // Step 3: Click on the "Save" button
          CallNumberBrowseSettings.clickSaveButtonForItem(testData.callNumberBrowseOption);

          // Verify successful saving toast notification is displayed
          InteractorsTools.checkCalloutMessage(saveCalloutText);

          // Verify "Edit" (pencil) icon is displayed in the "Actions" column instead of "Cancel" and "Save" buttons
          CallNumberBrowseSettings.validateEditButtonForItemExists(testData.callNumberBrowseOption);

          // Verify "Call number types" column of updated call number browse option is empty
          CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
            testData.callNumberBrowseOption,
            '',
          );
        },
      );
    });
  });
});
