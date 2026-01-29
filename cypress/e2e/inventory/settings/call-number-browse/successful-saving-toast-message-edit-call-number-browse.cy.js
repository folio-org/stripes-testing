import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import {
  CallNumberTypes,
  CALL_NUMBER_TYPES_DEFAULT,
} from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
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
      let localCallNumberType;

      const testData = {
        localCallNumberTypeName: `AT_C627459_LocalCNType_${getRandomPostfix()}`,
        callNumberBrowseOption: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL, // Use a specific option for this test
        selectedCallNumberType: CALL_NUMBER_TYPES_DEFAULT.DEWEY_DECIMAL_CLASSIFICATION,
      };

      const saveCalloutText = `The call number browse type ${testData.callNumberBrowseOption} was successfully updated`;

      before('Create test data', () => {
        cy.getAdminToken();

        // Create a local call number type
        CallNumberTypes.createCallNumberTypeViaApi({ name: testData.localCallNumberTypeName }).then(
          (id) => {
            localCallNumberType = { id, name: testData.localCallNumberTypeName };
          },
        );

        // Reset call number browse settings to ensure clean state
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: testData.callNumberBrowseOption,
          callNumberTypes: [],
        });

        cy.createTempUser([Permissions.uiSettingsCallNumberBrowseView.gui]).then(
          (userProperties) => {
            user = userProperties;
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
        // Delete local call number type
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(localCallNumberType.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C627459 Successful saving toast message is displayed after editing and saving "Call number browse" option (spitfire)',
        { tags: ['extendedPathFlaky', 'nonParallel', 'spitfire', 'C627459'] },
        () => {
          // Step 1: Click on the "Edit" (pencil) icon next to any Call number browse option
          CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
            testData.callNumberBrowseOption,
            '',
          );
          CallNumberBrowseSettings.clickEditButtonForItem(testData.callNumberBrowseOption);

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

          // Step 2: Click on the multi-select dropdown element and select one of the available options
          CallNumberBrowseSettings.expandCallNumberTypeDropdownOption(
            testData.callNumberBrowseOption,
          );

          // Verify the local call number type is available and select it
          CallNumberBrowseSettings.validateAvailableCallNumberTypeOption(
            testData.localCallNumberTypeName,
          );
          CallNumberBrowseSettings.selectCallNumberTypeDropdownOption(
            testData.localCallNumberTypeName,
          );

          // Verify selected option is displayed in input field of multi-select element
          CallNumberBrowseSettings.validateOptionSelectedInCallNumberTypesDropdown(
            testData.callNumberBrowseOption,
            [testData.localCallNumberTypeName],
          );

          // Verify multi-select dropdown is still expanded
          CallNumberBrowseSettings.validateCallNumberTypesDropdownExpanded(
            testData.callNumberBrowseOption,
          );

          // Verify "Save" button became enabled
          CallNumberBrowseSettings.validateSaveButtonStatusForItem({
            itemName: testData.callNumberBrowseOption,
            isEnabled: true,
          });

          // Step 3: Click on the "Save" button
          CallNumberBrowseSettings.clickSaveButtonForItem(testData.callNumberBrowseOption);

          // Verify successful saving toast notification is displayed with the exact message
          InteractorsTools.checkCalloutMessage(saveCalloutText);

          // Verify "Edit" (pencil) icon is displayed in the "Actions" column instead of "Cancel" and "Save" buttons
          CallNumberBrowseSettings.validateEditButtonForItemExists(testData.callNumberBrowseOption);

          // Verify option selected by user displays in "Call number types" column of updated browse option
          CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
            testData.callNumberBrowseOption,
            testData.localCallNumberTypeName,
            true,
          );
        },
      );
    });
  });
});
