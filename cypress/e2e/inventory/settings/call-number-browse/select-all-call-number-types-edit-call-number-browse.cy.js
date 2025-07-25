import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import {
  CallNumberTypes,
  CALL_NUMBER_TYPES_DEFAULT,
} from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      let user;
      let localCallNumberType;

      const testData = {
        localCallNumberTypeName: `AT_C627457_LocalCNType_${getRandomPostfix()}`,
        callNumberBrowseOption: Object.keys(callNumbersIds)[0], // Use the first available option
        callNumberBrowseId: callNumbersIds[0],
      };

      const saveCalloutText = `The call number browse type ${testData.callNumberBrowseOption} was successfully updated`;

      // All expected default call number types plus our local one
      const expectedCallNumberTypes = [
        ...Object.values(CALL_NUMBER_TYPES_DEFAULT),
        testData.localCallNumberTypeName,
      ];

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
        'C627457 Select all available "Call number type" when edit "Call number browse" option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C627457'] },
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

          // Step 2: Click on the multi-select dropdown element and select all options one by one
          CallNumberBrowseSettings.expandCallNumberTypeDropdownOption(
            testData.callNumberBrowseOption,
          );

          // Select all available call number types
          expectedCallNumberTypes.forEach((callNumberType) => {
            CallNumberBrowseSettings.validateAvailableCallNumberTypeOption(callNumberType);
            CallNumberBrowseSettings.selectCallNumberTypeDropdownOption(callNumberType);
            cy.wait(500); // Wait between selections to ensure proper state update
          });

          // Verify selected options are displayed in the input field of multi-select element
          CallNumberBrowseSettings.validateOptionSelectedInCallNumberTypesDropdown(
            testData.callNumberBrowseOption,
            expectedCallNumberTypes,
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

          // Verify successful saving toast notification is displayed
          InteractorsTools.checkCalloutMessage(saveCalloutText);

          // Verify "Edit" (pencil) icon is displayed in the "Actions" column instead of "Cancel" and "Save" buttons
          CallNumberBrowseSettings.validateEditButtonForItemExists(testData.callNumberBrowseOption);

          // Verify all selected options are displayed in the "Call number types" column
          // The display shows all types as expected in the test case description
          // Verify that the row shows the expected call number types
          CallNumberBrowseSettings.validateCallNumberBrowseRowInTable(
            testData.callNumberBrowseOption,
            expectedCallNumberTypes.join(''),
            true,
          );
        },
      );
    });
  });
});
