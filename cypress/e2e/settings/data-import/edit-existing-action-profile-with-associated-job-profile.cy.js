import { Permissions } from '../../../support/dictionary';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import ConfirmChanges from '../../../support/fragments/data_import/action_profiles/modals/confirmChanges';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const mappingProfile = {
      name: `C367994 autotest mapping profile ${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C367994 autotest action profile ${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const jobProfile = {
      profileName: `C367994 autotest job profile${getRandomPostfix()}`,
    };
    const calloutMessage = `The action profile "${actionProfile.name}" was successfully updated`;

    before('create user', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
        (mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfile.id = actionProfileResponse.body.id;

            NewJobProfile.createJobProfileWithLinkedActionProfileViaApi(
              jobProfile.profileName,
              actionProfileResponse.body.id,
            );
          });
        },
      );

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C367994 Edit an existing action profile with associated job profile (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.search(actionProfile.name);
        ActionProfiles.verifyActionProfileOpened(actionProfile.name);
        ActionProfileView.edit();
        ActionProfileEdit.verifyScreenName(actionProfile.name);
        ActionProfileEdit.changeAction();
        ActionProfileEdit.save();
        ConfirmChanges.cancelChanges();
        ActionProfileEdit.verifyScreenName(actionProfile.name);
        ActionProfileEdit.changesNotSaved();
        ActionProfileEdit.save();
        ConfirmChanges.confirmChanges();
        ActionProfiles.checkListOfExistingProfilesIsDisplayed();
        ActionProfiles.checkCalloutMessage(calloutMessage);
        ActionProfileView.verifyAction();
      },
    );
  });
});
