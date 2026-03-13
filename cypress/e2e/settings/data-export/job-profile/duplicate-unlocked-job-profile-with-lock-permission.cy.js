import permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
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
let fieldMappingProfileId;
let referencedFieldMappingProfileId;

const mappingProfileName = getTestEntityValue('C1030068_fieldMappingProfile');
const jobProfileName = getTestEntityValue('C1030068_jobProfile');
const jobProfileDuplicateName = getTestEntityValue('C1030068_jobProfileDuplicate');
const jobProfileDescription = getTestEntityValue('C1030068_jobProfileDescription');

const referencedMappingProfileName = getTestEntityValue('C1030068_referencedFieldMappingProfile');
const referencedJobProfileName = getTestEntityValue('C1030068_referencedJobProfile');
const referencedJobProfileDuplicateName = getTestEntityValue(
  'C1030068_referencedJobProfileDuplicate',
);
const referencedJobProfileDescription = getTestEntityValue(
  'C1030068_referencedJobProfileDescription',
);

const duplicatedJobProfileCalloutMessage = `Job profile ${jobProfileDuplicateName} has been successfully created`;
const duplicatedReferencedJobProfileCalloutMessage = `Job profile ${referencedJobProfileDuplicateName} has been successfully created`;
const csvFileName = 'empty.csv';

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
        user = userProperties;

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(mappingProfileName).then(
          (response) => {
            fieldMappingProfileId = response.body.id;
            ExportNewJobProfile.createNewJobProfileViaApi(jobProfileName, response.body.id);
          },
        );

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          referencedMappingProfileName,
        ).then((response) => {
          referencedFieldMappingProfileId = response.body.id;
          ExportNewJobProfile.createNewJobProfileViaApi(
            referencedJobProfileName,
            response.body.id,
          ).then(() => {
            ExportFile.exportFileViaApi(csvFileName, 'instance', referencedJobProfileName);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();

      ExportJobProfiles.getJobProfile({ query: `"name"=="${jobProfileDuplicateName}"` }).then(
        (response) => {
          if (response) {
            ExportJobProfiles.deleteJobProfileViaApi(response.id);
          }
        },
      );

      ExportJobProfiles.getJobProfile({
        query: `"name"=="${referencedJobProfileDuplicateName}"`,
      }).then((response) => {
        if (response) {
          cy.getDataExportJobProfile({ query: `"id"=="${response.id}"` }).then((profile) => {
            profile.locked = false;
            cy.updateDataExportJobProfile(response.id, profile);
          });
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        }
      });

      ExportJobProfiles.getJobProfile({ query: `"name"=="${jobProfileName}"` }).then((response) => {
        if (response) {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        }
      });

      ExportJobProfiles.getJobProfile({ query: `"name"=="${referencedJobProfileName}"` }).then(
        (response) => {
          if (response) {
            ExportJobProfiles.deleteJobProfileViaApi(response.id);
          }
        },
      );

      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(referencedFieldMappingProfileId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1030068 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to duplicate unlocked job profile (firebird)',
      { tags: ['extendedPath', 'firebird', 'C1030068'] },
      () => {
        // Step 1: Select existing unlocked job profile from Preconditions: job profile not referenced in an existing export job
        SettingsDataExport.goToSettingsDataExport();
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 2: Click on Actions menu => Duplicate option
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        ExportNewJobProfile.verifyNewJobProfileForm();
        SingleJobProfile.verifyProfileFieldsValues(
          `Copy of ${jobProfileName}`,
          mappingProfileName,
          '',
        );
        ExportNewJobProfile.verifyLockProfileCheckbox(false, false);
        SettingsDataExport.verifyPageTitle('Data export settings - New job profile - FOLIO');

        // Step 3: Click "Cancel" button without making any changes
        SingleJobProfile.clickCancelButton();
        ExportJobProfiles.waitLoading();

        // Step 4: Repeat Steps 1-2, make changes to the Name, Mapping profile or Description from job profile form, click "Cancel" button
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.editJobProfile(jobProfileDuplicateName);
        ExportNewJobProfile.fillinDescription(jobProfileDescription);
        SingleJobProfile.clickCancelButton();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.verifyJobProfileAbsentInTheTable(jobProfileDuplicateName);

        // Step 5: Repeat Steps 1-2, make changes to the Name, Mapping profile or Description from job profile form, click "Save & close" button
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.editJobProfile(jobProfileDuplicateName);
        ExportNewJobProfile.fillinDescription(jobProfileDescription);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(duplicatedJobProfileCalloutMessage);

        // Step 6: Verify row with duplicated job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(jobProfileDuplicateName, user);

        // Step 7: Click on the row with duplicated job profile
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileDuplicateName);
        SingleJobProfile.waitLoading(jobProfileDuplicateName);
        SingleJobProfile.verifyViewProfileDetails(
          jobProfileDuplicateName,
          mappingProfileName,
          jobProfileDescription,
        );
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 8: Close Job profile view page by clicking "X" button, Select existing unlocked job profile from Preconditions: job profile referenced in an existing export job
        SingleJobProfile.clickXButton();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(referencedJobProfileName);
        SingleJobProfile.waitLoading(referencedJobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 9: Click on Actions menu => Duplicate option, Make changes to the Name, Mapping profile or Description from job profile form, Check "Lock profile" checkbox, Click "Save & close" button
        SingleJobProfile.openActions();
        SingleJobProfile.clickDuplicateButton();
        SingleJobProfile.editJobProfile(referencedJobProfileDuplicateName);
        ExportNewJobProfile.fillinDescription(referencedJobProfileDescription);
        ExportNewJobProfile.clickLockProfileCheckbox();
        ExportNewJobProfile.verifyLockProfileCheckbox(true, false);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(duplicatedReferencedJobProfileCalloutMessage);

        // Step 10: Verify row with duplicated job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(referencedJobProfileDuplicateName, user, true);

        // Step 11: Click on the row with duplicated job profile
        ExportJobProfiles.clickProfileNameFromTheList(referencedJobProfileDuplicateName);
        SingleJobProfile.waitLoading(referencedJobProfileDuplicateName);
        SingleJobProfile.verifyViewProfileDetails(
          referencedJobProfileDuplicateName,
          referencedMappingProfileName,
          referencedJobProfileDescription,
        );
        SingleJobProfile.verifyLockProfileCheckbox(true, true);
      },
    );
  });
});
