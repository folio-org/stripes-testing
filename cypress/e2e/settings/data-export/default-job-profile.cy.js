import permissions from '../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;

describe('settings: data-export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C380470 Verify that Default Data export profiles are present (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      ExportJobProfiles.goToJobProfilesTab();
      ExportJobProfiles.verifyDefaultProfiles();
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportFieldMappingProfiles.verifyDefaultProfiles();
    },
  );
});
