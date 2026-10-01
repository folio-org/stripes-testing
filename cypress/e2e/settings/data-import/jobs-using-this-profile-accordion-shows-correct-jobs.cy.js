import {
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_ACTION_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import { JobProfiles as SettingsJobProfiles } from '../../../support/fragments/settings/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Data Import', () => {
  describe('Settings', () => {
    const filePathToUpload = 'oneMarcBib.mrc';
    const randomPostfix = getRandomPostfix();
    const customJobProfileName = `AT_C347924_JobProfile_${randomPostfix}`;
    // A different, already-existing profile - its job must NOT show under our own profile
    const otherJobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const ownFileNames = [
      `AT_C347924_own1_${randomPostfix}.mrc`,
      `AT_C347924_own2_${randomPostfix}.mrc`,
    ];
    const otherFileName = `AT_C347924_other_${randomPostfix}.mrc`;

    let user;
    const createdInstanceIds = [];

    before('Create job profile and test data', () => {
      cy.getAdminToken();

      ActionProfile.getActionProfilesViaApi({
        query: `name="${DEFAULT_ACTION_PROFILE_NAMES.CREATE_INSTANCE}"`,
      }).then(({ actionProfiles }) => {
        NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
          customJobProfileName,
          actionProfiles[0].id,
        );

        // Import the same generic bib file twice via our own profile...
        ownFileNames.forEach((fileName) => {
          DataImport.uploadFileViaApi(filePathToUpload, fileName, customJobProfileName).then(
            (response) => {
              createdInstanceIds.push(response[0].instance.id);
            },
          );
        });
      });

      // ...and once more via a different profile, to prove it's excluded from our own profile's
      // "Jobs using this profile" accordion
      DataImport.uploadFileViaApi(filePathToUpload, otherFileName, otherJobProfile).then(
        (response) => {
          createdInstanceIds.push(response[0].instance.id);
        },
      );

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: SettingsJobProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      createdInstanceIds.forEach((id) => InventoryInstance.deleteInstanceViaApi(id));
      SettingsJobProfiles.deleteJobProfileByNameViaApi(customJobProfileName);
    });

    it(
      'C347924 Ensure Job profiles are showing correct info for "Jobs using this profile" accordion (promin)',
      { tags: ['extendedPath', 'promin', 'C347924'] },
      () => {
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(customJobProfileName);
        JobProfileView.verifyJobProfileOpened();

        // Both of our own jobs are shown...
        ownFileNames.forEach((fileName) => {
          JobProfileView.verifyJobsUsingThisProfileSection(fileName);
        });

        // ...but the job run via a different profile is not
        JobProfileView.verifyJobsUsingThisProfileSection(otherFileName, false);

        // verify total job rows count
        JobProfileView.verifyJobsUsingThisProfileRowsCount(ownFileNames.length);
      },
    );
  });
});
