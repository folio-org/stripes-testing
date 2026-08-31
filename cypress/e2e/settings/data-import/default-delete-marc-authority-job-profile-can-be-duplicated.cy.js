import { matching } from '../../../../interactors';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import Notifications from '../../../support/fragments/settings/dataImport/notifications';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    describe('MARC authority', () => {
      const originalProfileName = 'Default - Delete MARC Authority records';
      const randomPostfix = getRandomPostfix();
      const duplicatedProfileName = `AT_C1453726_JobProfile_${randomPostfix}`;
      const testData = {};
      const capabSetsToAssign = [CapabilitySets.uiDataImportSettingsManage];

      before('Create user and login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.login(testData.user.username, testData.user.password, {
            path: SettingsMenu.jobProfilePath,
            waiter: SettingsJobProfiles.waitLoading,
          });
          JobProfiles.waitLoadingList();
        });
      });

      after('Delete created job profile and user', () => {
        cy.getAdminToken();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(duplicatedProfileName);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1453726 "Default - Delete MARC Authority records" job profile can be successfully duplicated (promin)',
        { tags: ['criticalPath', 'promin', 'C1453726'] },
        () => {
          // Step 1: Open "Default - Delete MARC Authority records" profile
          JobProfiles.search(originalProfileName);
          JobProfiles.openJobProfileView(originalProfileName);
          JobProfileView.verifyJobProfileOpened();

          // Step 2: Duplicate via Actions menu
          JobProfileView.duplicate();

          // Step 3: Update the Name field with a unique value
          NewJobProfile.fillProfileName(duplicatedProfileName);

          // Step 4: Save; verify callout, new profile in list, original still in list
          NewJobProfile.saveAndClose();
          InteractorsTools.checkCalloutMessage(
            matching(new RegExp(Notifications.jobProfileCreatedSuccessfully)),
          );
          JobProfileView.verifyJobProfileName(duplicatedProfileName);
          JobProfiles.search(originalProfileName);
          JobProfiles.verifyJobProfileShownInList(originalProfileName);
          JobProfiles.search(duplicatedProfileName);
          JobProfiles.verifyJobProfileShownInList(duplicatedProfileName);

          // Step 5: For opened duplicated profile, verify Edit, Duplicate, Delete are all enabled
          JobProfiles.openJobProfileView(originalProfileName);
          JobProfileView.verifyJobProfileName(duplicatedProfileName);
          JobProfileView.checkActionsMenuOptionsEnabled({
            editEnabled: true,
            duplicateEnabled: true,
            deleteEnabled: true,
          });
        },
      );
    });
  });
});
