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
let adminSourceRecord;
const mappingProfileName = getTestEntityValue('C350671 fieldMappingProfile');
const jobProfileName = getTestEntityValue('C350671 jobProfile');
const jobProfileNewName = getTestEntityValue('C350671 jobProfileNew');
const jobProfileDescription = getTestEntityValue('C350671 jobProfileDescription');
const referencedMappingProfileName = getTestEntityValue('C350671 referencedFieldMappingProfile');
const referencedJobProfileName = getTestEntityValue('C350671 referencedJobProfile');
const referencedJobProfileNewName = getTestEntityValue('C350671 referencedJobProfileNew');
const referencedJobProfileDescription = getTestEntityValue(
  'C350671 referencedJobProfileDescription',
);
const editedJobProfileCalloutMessage = `Job profile ${jobProfileNewName} has been successfully edited`;
const editedReferencedJobProfileCalloutMessage = `Job profile ${referencedJobProfileNewName} has been successfully edited`;
const csvFileName = 'empty.csv';

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportViewAddUpdateProfiles.gui]).then(
        (userProperties) => {
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
              // Export file using referenced job profile to make it "referenced"
              ExportFile.exportFileViaApi(csvFileName, 'instance', referencedJobProfileName);
            });
          });

          cy.getAdminSourceRecord().then((record) => {
            adminSourceRecord = record;
          });
          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportJobProfiles.getJobProfile({ query: `"name"=="${jobProfileNewName}"` }).then(
        (response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      ExportJobProfiles.getJobProfile({ query: `"name"=="${referencedJobProfileNewName}"` }).then(
        (response) => {
          ExportJobProfiles.deleteJobProfileViaApi(response.id);
        },
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(referencedFieldMappingProfileId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350671 User with "Settings - UI-Data-Export Settings - Edit" capability set is able to edit unlocked job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C350671'] },
      () => {
        // Step 1: Select existing unlocked job profile from Preconditions: job profile not referenced in an existing export job
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 2: Click "Actions" menu button
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuOptions();

        // Step 3: Click on Actions menu => Edit option
        SingleJobProfile.clickEditButton();
        SingleJobProfile.waitLoading(`Edit ${jobProfileName}`);
        SingleJobProfile.verifyProfileDetailsEditable();
        SingleJobProfile.verifySource(adminSourceRecord);
        SingleJobProfile.verifyLockProfileCheckbox(false, true);
        SingleJobProfile.verifySaveAndCloseButtonDisabled(true);
        SingleJobProfile.verifyCancelButtonDisabled(false);
        SingleJobProfile.verifyXButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(`Data export settings - ${jobProfileName} - FOLIO`);

        // Step 4: Click "Cancel" button without any changes
        SingleJobProfile.clickCancelButton();
        ExportJobProfiles.waitLoading();

        // Step 5: Repeat Steps 1, 3, make changes on the job profile, click "Cancel" button
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickEditButton();
        SingleJobProfile.editJobProfile(jobProfileNewName);
        ExportNewJobProfile.fillinDescription(jobProfileDescription);
        SingleJobProfile.clickCancelButton();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.verifyJobProfileInTheTable(jobProfileName);

        // Step 6: Repeat Steps 1, 3, make changes on the job profile, click "Save & close" button
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileName);
        SingleJobProfile.waitLoading(jobProfileName);
        SingleJobProfile.openActions();
        SingleJobProfile.clickEditButton();
        SingleJobProfile.editJobProfile(jobProfileNewName);
        ExportNewJobProfile.fillinDescription(jobProfileDescription);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(editedJobProfileCalloutMessage);

        // Step 7: Verify row with edited job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(jobProfileNewName, user);

        // Step 8: Click on the row with edited job profile
        ExportJobProfiles.clickProfileNameFromTheList(jobProfileNewName);
        SingleJobProfile.waitLoading(jobProfileNewName);
        SingleJobProfile.verifyViewProfileDetails(
          jobProfileNewName,
          mappingProfileName,
          jobProfileDescription,
        );

        // Step 9: Select existing unlocked job profile from Preconditions: job profile referenced in an existing export job
        ExportJobProfiles.clickProfileNameFromTheList(referencedJobProfileName);
        SingleJobProfile.waitLoading(referencedJobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 10: Click "Actions" menu button
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuOptions();

        // Step 11: Click on Actions menu => Edit option, make changes on the job profile, click "Save & close" button
        SingleJobProfile.clickEditButton();
        SingleJobProfile.editJobProfile(referencedJobProfileNewName);
        ExportNewJobProfile.fillinDescription(referencedJobProfileDescription);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(editedReferencedJobProfileCalloutMessage);

        // Step 12: Verify row with edited job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(referencedJobProfileNewName, user);

        // Step 13: Click on the row with edited job profile
        ExportJobProfiles.clickProfileNameFromTheList(referencedJobProfileNewName);
        SingleJobProfile.waitLoading(referencedJobProfileNewName);
        SingleJobProfile.verifyViewProfileDetails(
          referencedJobProfileNewName,
          referencedMappingProfileName,
          referencedJobProfileDescription,
        );
      },
    );
  });
});
