import { Accordion, HTML, including } from '../../../../interactors';
import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const postfix = getRandomPostfix();
    const mappingProfile = { name: `C449372 autotest mapping profile ${postfix}` };
    const actionProfile = {
      name: `C449372 autotest action profile ${postfix}`,
      action: 'CREATE',
      folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
    };
    const jobProfile = {
      profileName: `C449372 autotest job profile ${postfix}`,
    };
    // Built-in system match profile, shipped by default with any FOLIO environment ("System"
    // in its "Updated by" column) - not something this test creates
    const systemMatchProfileName = 'Inventory Single Record - Default match for no SRS record';

    before('Create test data and login', () => {
      cy.getAdminToken();

      // A job profile needs at least one valid, saveable association to exist (a bare one with
      // zero relations is rejected by the API) - a single non-match action profile, with no
      // match branch yet, is the minimal valid starting point for this test
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfile.id = actionProfileResponse.body.id;

            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              jobProfile.profileName,
              actionProfile.id,
            ).then((id) => {
              jobProfile.id = id;
            });
          });
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C449372 Verify the availability to link system match profiles to existing job profile (promin)',
      { tags: ['edgeCases', 'promin', 'C449372'] },
      () => {
        // Precondition: job profile details are opened in the 4th pane
        JobProfiles.select(jobProfile.profileName);

        // Step 1: open the job profile in edit mode
        JobProfileView.edit();
        JobProfileEdit.verifyScreenName(jobProfile.profileName);

        // Steps 2-3: "+" in Overview -> "Match" -> pick the system match profile - it appears
        // in the Overview section (asserted inside linkMatchProfile)
        NewJobProfile.linkMatchProfile(systemMatchProfileName);

        // Step 4: save - no error, updated job profile details shown in the 4th pane
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyJobProfileOpened();

        // Step 5: the system match profile is still displayed in the Overview accordion
        cy.expect(
          Accordion('Overview')
            .find(HTML(including(systemMatchProfileName)))
            .exists(),
        );
      },
    );
  });
});
