import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SingleFieldMappingProfilePane from '../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import SettingsMenu from '../../../support/fragments/settingsMenu';

let user;

describe('settings: data-export', () => {
  before('create user and go to page', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  });

  beforeEach('go to page', () => {
    cy.visit(SettingsMenu.exportMappingProfilePath);
  });

  after('delete user', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C10982 "Settings" > "Data export" > "Field mapping profiles" page (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
      ExportFieldMappingProfiles.verifyDefaultProfiles();
    },
  );

  it(
    'C15822 Preventing changes to the default instance mapping profile (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      SingleFieldMappingProfilePane.clickProfileNameFromTheList('Default instance mapping profile');
      SingleFieldMappingProfilePane.waitLoading('Default instance mapping profile');
      SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();
    },
  );

  it(
    'C15825 Profiles that cannot be edited or deleted (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      SingleFieldMappingProfilePane.clickProfileNameFromTheList('Default holdings mapping profile');
      SingleFieldMappingProfilePane.waitLoading('Default holdings mapping profile');
      SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();
    },
  );
});
