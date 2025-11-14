import permissions from '../../../../support/dictionary/permissions';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import SingleFieldMappingProfilePane from '../../../../support/fragments/data-export/exportMappingProfile/singleFieldMappingProfilePane';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

let user;

describe('Data Export', () => {
  describe('Mapping profile - setup', () => {
    before('create user and go to page', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    beforeEach('go to page', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      ExportFieldMappingProfiles.openTabFromDataExportSettingsList();
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C10982 "Settings" > "Data export" > "Field mapping profiles" page (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C10982'] },
      () => {
        ExportFieldMappingProfiles.verifyFieldMappingProfilesPane();
        ExportFieldMappingProfiles.verifyDefaultProfiles();
      },
    );

    it(
      'C15822 Preventing changes to the default instance mapping profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C15822'] },
      () => {
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          'Default instance mapping profile',
        );
        SingleFieldMappingProfilePane.waitLoading('Default instance mapping profile');
        SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();
      },
    );

    it(
      'C15825 Profiles that cannot be edited or deleted (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C15825'] },
      () => {
        SingleFieldMappingProfilePane.clickProfileNameFromTheList(
          'Default holdings mapping profile',
        );
        SingleFieldMappingProfilePane.waitLoading('Default holdings mapping profile');
        SingleFieldMappingProfilePane.verifyOnlyDuplicateOptionAvailable();
      },
    );
  });
});
