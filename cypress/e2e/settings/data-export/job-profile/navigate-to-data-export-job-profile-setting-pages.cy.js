import permissions from '../../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

let user;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
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

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C10952 Navigate to the data export job profile setting pages (firebird)',
      { tags: ['extendedPath', 'firebird', 'C10952'] },
      () => {
        // Step 1: Select "Job profiles" on the "Data export" second pane
        SettingsDataExport.goToSettingsDataExport();
        ExportJobProfiles.verifyJobProfilesElements();
        ExportJobProfiles.verifyNewButtonEnabled();

        // Step 2: Verify the table with the list of all existing Job profiles
        ExportJobProfiles.verifyDefaultProfiles();

        // Step 3: Verify count of the existing Job profiles in the header of the "Job profiles" pane
        ExportJobProfiles.verifyJobProfilesCount();
      },
    );
  });
});
