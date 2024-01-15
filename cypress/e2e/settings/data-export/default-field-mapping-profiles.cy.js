import permissions from '../../../support/dictionary/permissions';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SingleFieldMappingProfilePane from '../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

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
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C10982 "Settings" > "Data export" > "Field mapping profiles" page (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
      ExportFieldMappingProfiles.verifyDefaultProfiles();
    },
  );

  it(
    'C15822 Preventing changes to the default instance mapping profile (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      SingleFieldMappingProfilePane.clickProfileNameFromTheList('Default instance mapping profile');
      SingleFieldMappingProfilePane.waitLoading('Default instance mapping profile');
      SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();
    },
  );

  it(
    'C15825 Profiles that cannot be edited or deleted (firebird)',
    { tags: ['criticalPath', 'firebird'] },
    () => {
      SingleFieldMappingProfilePane.clickProfileNameFromTheList('Default holdings mapping profile');
      SingleFieldMappingProfilePane.waitLoading('Default holdings mapping profile');
      SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();
    },
  );
});
