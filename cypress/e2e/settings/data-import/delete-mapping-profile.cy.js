import { Permissions } from '../../../support/dictionary';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const notLinkedMappingProfile = {
      name: `C2353_autotest_mappingProfile${getRandomStringCode(160)}`,
    };
    const linkedMappingProfile = {
      name: `C2353_autotest_mappingProfile${getRandomPostfix()}`,
    };
    const actionProfile = {
      name: `C2353_autotest_actionProfile${getRandomPostfix()}`,
      action: 'CREATE',
      folioRecordType: 'INSTANCE',
    };
    const jobProfile = `C2353_autotest_jobProfile${getRandomPostfix()}`;

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        // create mapping profile profile linked to action profile
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(linkedMappingProfile)
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
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(notLinkedMappingProfile);
      });
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(linkedMappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C2353 Delete an existing field mapping profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2353'] },
      () => {
        FieldMappingProfiles.search(linkedMappingProfile.name);
        FieldMappingProfiles.selectMappingProfileFromList(linkedMappingProfile.name);

        FieldMappingProfileView.delete(linkedMappingProfile.name);
        FieldMappingProfileView.verifyCannotDeleteModalOpened();
        FieldMappingProfileView.closeCannotDeleteModal();
        FieldMappingProfileView.closeViewMode(linkedMappingProfile.name);

        FieldMappingProfiles.search(notLinkedMappingProfile.name);
        FieldMappingProfiles.selectMappingProfileFromList(notLinkedMappingProfile.name);

        FieldMappingProfileView.delete(notLinkedMappingProfile.name);
        FieldMappingProfiles.checkSuccessDelitionCallout(notLinkedMappingProfile.name);
        FieldMappingProfiles.search(notLinkedMappingProfile.name);
        FieldMappingProfiles.verifyMappingProfileAbsent();
      },
    );
  });
});
