import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';

let user;

describe('data-export', () => {
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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C380470 Verify that Default Data export profiles are present (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      ExportJobProfiles.goToJobProfilesTab();
      ExportJobProfiles.verifyDefaultProfiles();
      ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
      ExportFieldMappingProfiles.verifyDefaultProfiles();
    },
  );
});
