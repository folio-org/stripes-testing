import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C423390 Check that checkboxes and checkbox actions for Job profile are suppressed (promin)',
      { tags: ['extendedPath', 'promin', 'C423390'] },
      () => {
        // Step 1: Verify checkboxes are NOT present in the Job profiles list
        JobProfiles.verifyNoCheckboxesInList();

        // Step 2: Click "Actions" button and verify suppressed options are absent
        JobProfiles.verifyActionsMenuOptions();
      },
    );
  });
});
