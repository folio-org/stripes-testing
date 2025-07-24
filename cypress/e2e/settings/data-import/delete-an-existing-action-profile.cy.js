import { FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import ConfirmDelete from '../../../support/fragments/settings/dataImport/actionProfiles/modals/confirmDelete';
import ExceptionDelete from '../../../support/fragments/settings/dataImport/actionProfiles/modals/exceptionDelete';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
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
            waiter: SettingsActionProfiles.waitLoading,
          });
        });
      });
      SettingsActionProfiles.createWithoutLinkedMappingProfile(actionProfileToDelete);
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
        SettingsActionProfiles.search(profile.createActionProfile.name);
        SettingsActionProfiles.selectActionProfileFromList(profile.createActionProfile.name);
        ActionProfileView.delete();
        ConfirmDelete.confirmDeleteActionProfile();
        ExceptionDelete.verifyExceptionMessage();
        ExceptionDelete.closeException();
        SettingsActionProfiles.search(actionProfileToDelete.name);
        SettingsActionProfiles.selectActionProfileFromList(actionProfileToDelete.name);
        ActionProfileView.delete();
        ConfirmDelete.confirmDeleteActionProfile();
        SettingsActionProfiles.checkCalloutMessage(calloutMessage);
        SettingsActionProfiles.search(actionProfileToDelete.name);
        SettingsActionProfiles.verifyActionProfileAbsent();
      },
    );
  });
});
