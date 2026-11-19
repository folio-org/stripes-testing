import CapabilitySets from '../../../support/dictionary/capabilitySets';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import OtherSettings from '../../../support/fragments/settings/circulation/otherSettings';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { generateTextFieldCustomFieldData } from '../../../support/utils/customFields';

describe('Settings', () => {
  describe('Circulation', () => {
    const testData = {};
    const customFieldData = generateTextFieldCustomFieldData({ testNumber: 'C1385309' });

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        CustomFields.createCustomFieldsViaApi([customFieldData]).then((createdFields) => {
          testData.createdCustomFieldIds = createdFields.map((f) => f.id);
        });
        OtherSettings.setOtherSettingsViaApi({
          prefPatronIdentifier: 'barcode',
          useCustomFieldsAsIdentifiers: false,
        });
        cy.createTempUser([]).then((userProps) => {
          testData.user = userProps;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiCirculationSettingsOtherSettingsManage],
          );
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.circulationOtherSettingsPath,
            waiter: OtherSettings.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      OtherSettings.setOtherSettingsViaApi({
        prefPatronIdentifier: 'barcode,username',
        useCustomFieldsAsIdentifiers: false,
      });
      CustomFields.deleteCustomFieldsViaApi({ ids: testData.createdCustomFieldIds });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1385309 "Save" button status is correctly managed when editing "Patron id(s) for checkout scanning" section (vega)',
      { tags: ['extendedPath', 'vega', 'C1385309'] },
      () => {
        // Step 1: Check only Username, save — Save disables, toast appears
        OtherSettings.uncheckBarcodeCheckbox();
        OtherSettings.checkUsernameCheckbox();
        OtherSettings.verifyBarcodeCheckboxChecked(false);
        OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(false);
        OtherSettings.saveOtherSettings();
        InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
        OtherSettings.verifyUsernameCheckboxChecked(true);
        OtherSettings.verifySaveButtonEnabled(false);

        // Step 2: Check Barcode — Save enables
        OtherSettings.checkBarcodeCheckbox();
        OtherSettings.verifyBarcodeCheckboxChecked(true);
        OtherSettings.verifySaveButtonEnabled(true);

        // Step 3: Uncheck Barcode — Save disables immediately, no warning
        OtherSettings.uncheckBarcodeCheckbox();
        OtherSettings.verifyBarcodeCheckboxChecked(false);
        OtherSettings.verifySaveButtonEnabled(false);
        OtherSettings.verifyWarningMessage(false);

        // Step 4: Check "User custom fields" — dropdown appears empty, Save remains disabled
        OtherSettings.selectUserCustomFieldsCheckbox(true);
        OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(true);
        OtherSettings.verifyCustomFieldsDropdownVisible(true);
        OtherSettings.verifyCustomFieldsDropdownEmpty();
        OtherSettings.verifySaveButtonEnabled(false);

        // Step 5: Select custom field from dropdown — Save enables
        OtherSettings.selectCustomFieldPatronIdentifier(customFieldData.name);
        OtherSettings.verifyCustomFieldsDropdownHasValue(customFieldData.name);
        OtherSettings.verifySaveButtonEnabled(true);

        // Step 6: Save — toast appears, Save disables
        OtherSettings.saveOtherSettings();
        InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
        OtherSettings.verifySaveButtonEnabled(false);

        // Step 7: Reload — User custom fields checkbox and dropdown value persist
        cy.visit(SettingsMenu.circulationOtherSettingsPath);
        OtherSettings.waitLoading();
        OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(true);
        OtherSettings.verifyCustomFieldsDropdownHasValue(customFieldData.name);

        // Step 8: Clear dropdown — becomes empty, Save disables, warning appears
        OtherSettings.removeCustomFieldFromDropdown(customFieldData.name);
        OtherSettings.verifyCustomFieldsDropdownEmpty();
        OtherSettings.verifySaveButtonEnabled(false);
        OtherSettings.verifyWarningMessage(true);

        // Step 9: Re-select same custom field — Save remains disabled (no change vs saved), warning gone
        OtherSettings.selectCustomFieldPatronIdentifier(customFieldData.name);
        OtherSettings.verifyCustomFieldsDropdownHasValue(customFieldData.name);
        OtherSettings.verifySaveButtonEnabled(false);
        OtherSettings.verifyWarningMessage(false);

        // Step 10: Uncheck all checkboxes — Save disabled, warning "Please select to continue"
        OtherSettings.uncheckAllPatronIdentifierCheckboxes();
        OtherSettings.verifyBarcodeCheckboxChecked(false);
        OtherSettings.verifyUsernameCheckboxChecked(false);
        OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(false);
        OtherSettings.verifySaveButtonEnabled(false);
        OtherSettings.verifyWarningMessage(true);

        // Step 11: Check "User custom fields" — dropdown reappears with previously selected value, Save enables
        OtherSettings.selectUserCustomFieldsCheckbox(true);
        OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(true);
        OtherSettings.verifyCustomFieldsDropdownVisible(true);
        OtherSettings.verifyCustomFieldsDropdownHasValue(customFieldData.name);
        OtherSettings.verifySaveButtonEnabled(true);

        // Step 12: Save — toast appears, Save disables, only "User custom fields" with custom field remains
        OtherSettings.saveOtherSettings();
        InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
        OtherSettings.verifySaveButtonEnabled(false);
        OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(true);
        OtherSettings.verifyCustomFieldsDropdownHasValue(customFieldData.name);
        OtherSettings.verifyUsernameCheckboxChecked(false);
      },
    );
  });
});
