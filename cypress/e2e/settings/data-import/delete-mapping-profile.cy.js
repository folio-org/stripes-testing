import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
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
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(linkedMappingProfile);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C2353 Delete an existing field mapping profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
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
