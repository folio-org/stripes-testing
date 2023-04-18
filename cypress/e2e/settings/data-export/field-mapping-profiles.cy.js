import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';

let user;

describe('setting: data-export', () => {
  before('create user and go to page', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.settingsPath, waiter: SettingsPane.waitLoading });
      });
  });

  after('selete user', () => {
    Users.deleteViaApi(user.userId);
  });

  it('C10982 "Settings" > "Data export" > "Field mapping profiles" page (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    ExportFieldMappingProfiles.goTofieldMappingProfilesTab();
    ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
    ExportFieldMappingProfiles.verifyDefaultProfiles();
  });
});
