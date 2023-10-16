import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import Users from '../../../support/fragments/users/users';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const notLinkedMappingProfile = `C2353_autotest_mappingProfile${getRandomStringCode(160)}`;
    const linkedMappingProfile = `C2353_autotest_mappingProfile${getRandomPostfix()}`;
    const actionProfile = `C2353_autotest_actionProfile${getRandomPostfix()}`;
    const jobProfile = `C2353_autotest_jobProfile${getRandomPostfix()}`;

    before('login', () => {
      cy.getAdminToken().then(() => {
        // create mapping profile profile linked to action profile
        NewFieldMappingProfile.createMappingProfileViaApi(linkedMappingProfile)
          .then((mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              actionProfile,
              mappingProfileResponse.body.id,
            );
          })
          .then((actionProfileResponse) => {
            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              jobProfile,
              actionProfileResponse.body.id,
            );
          });
        // create not linked mapping profile
        NewFieldMappingProfile.createMappingProfileViaApi(notLinkedMappingProfile);
      });
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile);
      ActionProfiles.deleteActionProfile(actionProfile);
      FieldMappingProfileView.deleteViaApi(linkedMappingProfile);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2353 Delete an existing field mapping profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.mappingProfilePath);

        FieldMappingProfiles.search(linkedMappingProfile);
        FieldMappingProfiles.selectMappingProfileFromList(linkedMappingProfile);

        FieldMappingProfileView.delete(linkedMappingProfile);
        FieldMappingProfileView.verifyCannotDeleteModalOpened();
        FieldMappingProfileView.closeCannotDeleteModal();
        FieldMappingProfileView.closeViewMode(linkedMappingProfile);

        FieldMappingProfiles.search(notLinkedMappingProfile);
        FieldMappingProfiles.selectMappingProfileFromList(notLinkedMappingProfile);

        FieldMappingProfileView.delete(notLinkedMappingProfile);
        FieldMappingProfiles.checkSuccessDelitionCallout(notLinkedMappingProfile);
        FieldMappingProfiles.search(notLinkedMappingProfile);
        FieldMappingProfiles.verifyMappingProfileAbsent();
      },
    );
  });
});
