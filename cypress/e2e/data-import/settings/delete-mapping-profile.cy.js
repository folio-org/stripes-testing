import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import Users from '../../../support/fragments/users/users';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const notLinkedMappingProfile = `Autotest_mappingProfile${getRandomPostfix()}`;
    const linkedMappingProfile = `Autotest_mappingProfile${getRandomPostfix()}`;
    const actionProfile = `Autotest_actionProfile${getRandomPostfix()}`;

    before('login', () => {
      cy.getAdminToken().then(() => {
        // create mapping profile profile linked to action profile
        NewFieldMappingProfile.createMappingProfileViaApi(linkedMappingProfile).then(
          (mappingProfileResponse) => {
            NewActionProfile.createActionProfileViaApi(
              actionProfile,
              mappingProfileResponse.body.id,
            );
          },
        );
        // createt not linked mapping profile
        NewFieldMappingProfile.createMappingProfileViaApi(notLinkedMappingProfile);
      });
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      ActionProfiles.deleteActionProfile(actionProfile);
      FieldMappingProfileView.deleteViaApi(linkedMappingProfile);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2353 Delete an existing field mapping profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // #1 Go to "Settings" application-> "Data import" section-> "Field mapping profiles" section
        cy.visit(SettingsMenu.mappingProfilePath);

        // #2 Click field mapping profiles from the list until you find one with an associated job profile
        FieldMappingProfiles.search(linkedMappingProfile);
        FieldMappingProfiles.selectMappingProfileFromList(linkedMappingProfile);

        // #3 Click the Action menu at the top right to display possible actions
        // #4 Click "Delete" option and confirm by clicking "Delete" again
        FieldMappingProfileView.delete(linkedMappingProfile);
        // // You will be presented with a "Cannot delete field mapping profile" prompt and your only option will be to click "Close" and return to the Field mapping profile view
        FieldMappingProfileView.verifyCannotDeleteModalOpened();
        FieldMappingProfileView.closeCannotDeleteModal();
        FieldMappingProfileView.closeViewMode(linkedMappingProfile);

        // #5 Click the field mapping profiles that were created in the precondition
        FieldMappingProfiles.search(notLinkedMappingProfile);
        FieldMappingProfiles.selectMappingProfileFromList(notLinkedMappingProfile);

        // #6 Click the Action menu at the top right to display possible actions
        // #7 Click the "Delete" button
        // #8 Click  the "Delete" button in the confirmation modal window
        FieldMappingProfileView.delete(notLinkedMappingProfile);
        // You are returned to the Field mapping profile list, you are shown a green popup notification of the deletion.
        FieldMappingProfiles.checkSuccessDelitionCallout(notLinkedMappingProfile);
        FieldMappingProfiles.search(notLinkedMappingProfile);
        FieldMappingProfiles.verifyMappingProfileAbsent();
      },
    );
  });
});
