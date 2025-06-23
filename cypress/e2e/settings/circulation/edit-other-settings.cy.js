import Permissions from '../../../support/dictionary/permissions';
import OtherSettings from '../../../support/fragments/settings/circulation/otherSettings';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Permissions -> Circulation', () => {
  let testUser;

  before('Prepare test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.uiCirculationSettingsOtherSettings.gui
    ]).then(userProps => {
      testUser = userProps;
    });
    // Ensure useCustomFieldsAsIdentifiers is false before test
    OtherSettings.setOtherSettingsViaApi({ useCustomFieldsAsIdentifiers: false });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    // Reset useCustomFieldsAsIdentifiers to false after test
    OtherSettings.setOtherSettingsViaApi({ useCustomFieldsAsIdentifiers: false });
    Users.deleteViaApi(testUser.userId);
  });

  it('C1216 Settings (Circ): Can create, edit and remove other settings (vega)',
    { tags: ['extendedPath', 'vega', 'C1216'] },
    () => {
      cy.login(testUser.username, testUser.password, {
        path: SettingsMenu.circulationOtherSettingsPath,
        waiter: OtherSettings.waitLoading
      });

      OtherSettings.verifyUserCustomFieldsCheckboxIsSelected(false);
      OtherSettings.selectUserCustomFieldsCheckbox(true);
      OtherSettings.saveOtherSettings();

      InteractorsTools.checkCalloutMessage('Setting was successfully updated.');
      cy.wait(2000).then(() => {
        // Verify useCustomFieldsAsIdentifiers is true via API
        OtherSettings.verifyOtherSettingsContainsParams({ useCustomFieldsAsIdentifiers: true });
      });
    });
});
