import permissions from '../../../../support/dictionary/permissions';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SingleJobProfile from '../../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsDataExport from '../../../../support/fragments/data-export/settingsDataExport';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

let user;
const jobProfile = {
  jobProfileName: getTestEntityValue('C1030056 lockedJobProfile'),
  mappingProfileName: getTestEntityValue('C1030056 fieldMappingProfile'),
  mappingProfileId: null,
};

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
        user = userProperties;

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          jobProfile.mappingProfileName,
        ).then((response) => {
          jobProfile.mappingProfileId = response.body.id;

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportJobProfiles.getJobProfile({ query: `"name"=="${jobProfile.jobProfileName}"` }).then(
        (response) => {
          response.locked = false;
          cy.updateDataExportJobProfile(response.id, response);

          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(jobProfile.mappingProfileId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1030056 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to create locked job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1030056'] },
      () => {
        // Step 1: Click "New" button in the header of "Job profiles" pane
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.openNewJobProfileForm();
        ExportNewJobProfile.verifyNewJobProfileForm();
        ExportNewJobProfile.verifyLockProfileCheckbox(false, false);
        SettingsDataExport.verifyPageTitle('Data export settings - New job profile - FOLIO');

        // Step 2: Fill in "Name*" text field, Select any option from "Mapping profile*" dropdown list, Check "Lock profile" checkbox
        ExportNewJobProfile.fillinNameTextfield(jobProfile.jobProfileName);
        ExportNewJobProfile.selectMappingProfileFromDropdown(jobProfile.mappingProfileName);
        ExportNewJobProfile.clickLockProfileCheckbox();
        ExportNewJobProfile.verifyLockProfileCheckbox(true, false);
        SingleJobProfile.verifySaveAndCloseButtonDisabled(false);

        // Step 3: Click "Save & close" button
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${jobProfile.jobProfileName} has been successfully created`,
        );

        // Step 4: Verify row with newly created job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(jobProfile.jobProfileName, user, true);

        // Step 5: Click on the row with created job profile
        ExportJobProfiles.clickProfileNameFromTheList(jobProfile.jobProfileName);
        SingleJobProfile.waitLoading(jobProfile.jobProfileName);
        SingleJobProfile.verifyViewProfileDetails(
          jobProfile.jobProfileName,
          jobProfile.mappingProfileName,
          'No value set-',
        );
        SingleJobProfile.verifyLockProfileCheckbox(true, true);
      },
    );
  });
});
