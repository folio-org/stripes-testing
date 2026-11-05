import Permissions from '../../../support/dictionary/permissions';
import OtherSettings from '../../../support/fragments/settings/circulation/otherSettings';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { generateTextFieldCustomFieldData } from '../../../support/utils/customFields';

describe('Permissions -> Circulation', () => {
  let testUser;
  let createdCustomFieldIds = [];
  const customFieldData = generateTextFieldCustomFieldData({ testNumber: 'C1216' });

  before('Prepare test data', () => {
    cy.getAdminToken();
    cy.createTempUser([Permissions.uiCirculationSettingsOtherSettings.gui]).then((userProps) => {
      testUser = userProps;
    });
    CustomFields.createCustomFieldsViaApi([customFieldData]).then((fields) => {
      createdCustomFieldIds = fields.map((f) => f.id);
    });
    // Ensure useCustomFieldsAsIdentifiers is false before test
    OtherSettings.setOtherSettingsViaApi({ useCustomFieldsAsIdentifiers: false });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    // Reset useCustomFieldsAsIdentifiers to false after test
    OtherSettings.setOtherSettingsViaApi({ useCustomFieldsAsIdentifiers: false });
    CustomFields.deleteCustomFieldsViaApi({ ids: createdCustomFieldIds });
    Users.deleteViaApi(testUser.userId);
  });

  it(
    'C1216 Settings (Circ): Can create, edit and remove other settings (vega)',
    { tags: ['extendedPath', 'vega', 'C1216'] },
    () => {
      cy.login(testUser.username, testUser.password, {
        path: SettingsMenu.circulationOtherSettingsPath,
        waiter: OtherSettings.waitLoading,
      });

      // 1. Verify the "Use custom fields as identifiers" checkbox is unchecked
      OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(false);
      // 2. Check the "Use custom fields as identifiers" checkbox
      OtherSettings.selectUserCustomFieldsCheckbox(true);
      // 3. Select the created custom field as a patron identifier
      OtherSettings.selectCustomFieldPatronIdentifier(customFieldData.name);
      OtherSettings.saveOtherSettings();

      InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
      cy.wait(2000).then(() => {
        // Verify useCustomFieldsAsIdentifiers is true via API
        OtherSettings.verifyOtherSettingsContainsParams({ useCustomFieldsAsIdentifiers: true });
      });
    },
  );
});
