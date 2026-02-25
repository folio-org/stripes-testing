import permissions from '../../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
let fieldMappingProfileId;
const newJobProfileName = `jobProfile${getRandomPostfix()}`;
const secondNewJobProfileName = `secondJobProfile${getRandomPostfix()}`;
const fieldMappingProfileName = `fieldMappingProfile${getRandomPostfix()}`;
const newJobProfileCalloutMessage = `Job profile ${newJobProfileName} has been successfully created`;
const secondNewJobProfileCalloutMessage = `Job profile ${secondNewJobProfileName} has been successfully created`;
const newJobProfileDescription = `Description${getRandomPostfix()}`;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create user, job and navigate to page', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
          user = userProperties;
          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
            fieldMappingProfileName,
          ).then((response) => {
            fieldMappingProfileId = response.body.id;
          });
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
          ExportJobProfiles.goToJobProfilesTab();
        },
      );
    });

    after('delete jobs and user', () => {
      cy.getAdminToken();
      ExportJobProfiles.getJobProfile({ query: `"name"=="${newJobProfileName}"` }).then(
        (response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      ExportJobProfiles.getJobProfile({ query: `"name"=="${secondNewJobProfileName}"` }).then(
        (response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C10953 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to create unlocked job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C10953'] },
      () => {
        // Step 1: Click "New" button in the header of "Job profiles" pane
        ExportJobProfiles.openNewJobProfileForm();
        ExportNewJobProfile.verifyNewJobProfileForm();
        ExportNewJobProfile.verifyLockProfileCheckbox(false, true);
        SettingsDataExport.verifyPageTitle('Data export settings - New job profile - FOLIO');

        // Step 2: Verify that "Mapping profile*" dropdown list is populated with all existing mapping profiles
        ExportNewJobProfile.clickSelectMappingProfileDropdown();
        ExportNewJobProfile.verifyAllMappingProfilesPresentInDropdown();

        // Step 3:Click "Name*" text field -> Change focus to "Description" text area
        ExportNewJobProfile.clickNameTextfield();
        ExportNewJobProfile.clickDescriptionTextarea();
        ExportNewJobProfile.verifyNameValidationError();

        // Step 4: Fill in "Name*" field with value
        ExportNewJobProfile.fillinNameTextfield(newJobProfileName);
        ExportNewJobProfile.verifyClearNameButtonExists();
        ExportNewJobProfile.verifyNameValidationErrorGone();
        ExportNewJobProfile.verifySaveAndCloseButtonEnabled();

        // Step 5: Click away from "Mapping profile*" dropdown
        ExportNewJobProfile.clickSelectMappingProfileDropdown();
        ExportNewJobProfile.clickNameTextfield();
        ExportNewJobProfile.verifySelectMappingProfileValidationError();

        // Step 6: Select existing mapping profile from "Mapping profile*" dropdown
        ExportNewJobProfile.clickSelectMappingProfileDropdown();
        ExportNewJobProfile.selectMappingProfileFromDropdown(fieldMappingProfileName);
        ExportNewJobProfile.verifySelectMappingProfileValidationErrorGone();

        // Step 7: Click "Save & close" button
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(newJobProfileCalloutMessage);

        // Step 8: Verify row with newly created job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(newJobProfileName, user);

        // Step 9: Click "New" button in the header of "Job profiles" pane
        ExportJobProfiles.openNewJobProfileForm();
        ExportNewJobProfile.verifyNewJobProfileForm();
        ExportNewJobProfile.fillinDescription(newJobProfileDescription);

        // Step 10: Click "Save & close" button in the footer
        ExportNewJobProfile.saveJobProfile();
        ExportNewJobProfile.verifyNameValidationError();
        ExportNewJobProfile.verifySelectMappingProfileValidationError();

        // Step 11: Fill in all required fields and click "Save & close" button
        ExportNewJobProfile.fillinNameTextfield(secondNewJobProfileName);
        ExportNewJobProfile.selectMappingProfileFromDropdown(fieldMappingProfileName);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(secondNewJobProfileCalloutMessage);
        ExportJobProfiles.verifyProfileInTable(secondNewJobProfileName, user);
      },
    );
  });
});
