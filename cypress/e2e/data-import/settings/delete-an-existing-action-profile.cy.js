import getRandomPostfix from '../../../support/utils/stringTools';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ConfirmDelete from '../../../support/fragments/data_import/action_profiles/modals/confirmDelete';
import ExceptionDelete from '../../../support/fragments/data_import/action_profiles/modals/exceptionDelete';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const actionProfileToDelete = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2346 autotest action profile to delete ${getRandomStringCode(8)}`,
    };
    const profile = {
      createJobProfile: `autotest jobProfileForCreate.${getRandomPostfix()}`,
      createActionProfile: `autotest actionProfileForCreate${getRandomPostfix()}`,
      createMappingProfile: `autotest mappingProfileForCreate${getRandomPostfix()}`,
    };

    const calloutMessage = `The action profile "${actionProfileToDelete.name}" was successfully deleted`;

    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        NewFieldMappingProfile.createMappingProfileViaApi(profile.createMappingProfile).then(
          (mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              profile.createActionProfile,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
                profile.createJobProfile,
                actionProfileResponse.body.id,
              );
            });

            cy.login(user.username, user.password, {
              path: SettingsMenu.actionProfilePath,
              waiter: ActionProfiles.waitLoading,
            });
          },
        );
      });
      ActionProfiles.createWithoutLinkedMappingProfile(actionProfileToDelete);
    });

    after('Delete test data', () => {
      JobProfiles.deleteJobProfile(profile.createJobProfile);
      ActionProfiles.deleteActionProfile(profile.createActionProfile);
      FieldMappingProfileView.deleteViaApi(profile.createMappingProfile);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2346 Delete an existing action profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        ActionProfiles.search(profile.createActionProfile);
        ActionProfiles.selectActionProfileFromList(profile.createActionProfile);
        ActionProfileView.delete();
        ConfirmDelete.confirmDeleteActionProfile();
        ExceptionDelete.verifyExceptionMessage();
        ExceptionDelete.closeException();
        ActionProfiles.search(actionProfileToDelete.name);
        ActionProfiles.selectActionProfileFromList(actionProfileToDelete.name);
        ActionProfileView.delete();
        ConfirmDelete.confirmDeleteActionProfile();
        ActionProfiles.checkCalloutMessage(calloutMessage);
        ActionProfiles.search(actionProfileToDelete.name);
        ActionProfiles.verifyActionProfileAbsent();
      },
    );
  });
});
