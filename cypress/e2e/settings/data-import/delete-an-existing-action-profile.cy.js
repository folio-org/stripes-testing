import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import ConfirmDelete from '../../../support/fragments/data_import/action_profiles/modals/confirmDelete';
import ExceptionDelete from '../../../support/fragments/data_import/action_profiles/modals/exceptionDelete';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const actionProfileToDelete = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C2346 autotest action profile to delete ${getRandomStringCode(8)}`,
    };
    const profile = {
      createJobProfile: `autotest jobProfileForCreate.${getRandomPostfix()}`,
      createActionProfile: {
        name: `autotest actionProfileForCreate${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecordType: 'INSTANCE',
      },
      createMappingProfile: { name: `autotest mappingProfileForCreate${getRandomPostfix()}` },
    };

    const calloutMessage = `The action profile "${actionProfileToDelete.name}" was successfully deleted`;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        NewFieldMappingProfile.createInstanceMappingProfileViaApi(
          profile.createMappingProfile,
        ).then((mappingProfileResponse) => {
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
        });
      });
      ActionProfiles.createWithoutLinkedMappingProfile(actionProfileToDelete);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(profile.createJobProfile);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.createActionProfile);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(profile.createMappingProfile);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C2346 Delete an existing action profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2346'] },
      () => {
        ActionProfiles.search(profile.createActionProfile.name);
        ActionProfiles.selectActionProfileFromList(profile.createActionProfile.name);
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
