import CapabilitySets from '../../../support/dictionary/capabilitySets';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('MARC authority', () => {
      const profileName = 'Default - Delete MARC Authority records';
      const profileDescription =
        'Default job profile to delete MARC authority records. This job profile cannot be edited or deleted.';
      const testData = {};
      const capabSetsToAssign = [CapabilitySets.uiDataImportSettingsManage];
      const conditionsToCheck = [
        { label: 'Name', conditions: { value: profileName } },
        { label: 'Description', conditions: { value: profileDescription } },
      ];

      before('Create user and login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.jobProfilePath,
            waiter: SettingsJobProfiles.waitLoading,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1453724 "Default - Delete MARC Authority records" job profile is visible in the list, shows correct fields, and Edit/Delete actions are disabled (promin)',
        { tags: ['criticalPath', 'promin', 'C1453724'] },
        () => {
          // Step 1: Verify "Default - Delete MARC Authority records" is present in the list
          JobProfiles.search(profileName);
          JobProfiles.verifyJobProfileShownInList(profileName);

          // Step 2: Open profile and verify Name, Description, and linked match/action profiles
          JobProfiles.openJobProfileView(profileName);
          JobProfileView.verifyJobProfileOpened();
          JobProfileView.checkSummaryFieldsConditions(conditionsToCheck);
          JobProfileView.verifyLinkedProfiles([profileName, profileName], 2);

          // Step 3: Click Actions; verify Edit and Delete are disabled, Duplicate is enabled
          JobProfileView.checkActionsMenuOptionsEnabled({
            editEnabled: false,
            duplicateEnabled: true,
            deleteEnabled: false,
          });
        },
      );
    });
  });
});
