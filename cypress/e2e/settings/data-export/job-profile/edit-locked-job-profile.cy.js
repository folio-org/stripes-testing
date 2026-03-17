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
let adminSourceRecord;
const unlockedJobProfile = {
  jobProfileName: getTestEntityValue('C1030057 unlockedJobProfile'),
  description: 'No value set-',
  mappingProfileName: getTestEntityValue('C1030057 fieldMappingProfile'),
  mappingProfileId: null,
  jobProfileId: null,
};
const lockedJobProfile = {
  jobProfileName: getTestEntityValue('C1030057 lockedJobProfile'),
  description: 'No value set-',
  mappingProfileName: getTestEntityValue('C1030057 referencedFieldMappingProfile'),
  mappingProfileId: null,
  jobProfileId: null,
};
const csvFileName = 'empty.csv';

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportLockUnlockProfiles.gui]).then((userProperties) => {
        user = userProperties;

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          unlockedJobProfile.mappingProfileName,
        ).then((response) => {
          unlockedJobProfile.mappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(
            unlockedJobProfile.jobProfileName,
            response.body.id,
          ).then((jobProfileResponse) => {
            unlockedJobProfile.jobProfileId = jobProfileResponse.body.id;
          });
        });

        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          lockedJobProfile.mappingProfileName,
        ).then((response) => {
          lockedJobProfile.mappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(
            lockedJobProfile.jobProfileName,
            response.body.id,
            true,
          ).then((jobProfileResponse) => {
            lockedJobProfile.jobProfileId = jobProfileResponse.body.id;

            ExportFile.exportFileViaApi(csvFileName, 'instance', lockedJobProfile.jobProfileName);
          });
        });

        cy.getAdminSourceRecord().then((record) => {
          adminSourceRecord = record;
        });
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      cy.getDataExportJobProfile({ query: `"id"=="${unlockedJobProfile.jobProfileId}"` }).then(
        (jobProfile) => {
          jobProfile.locked = false;
          cy.updateDataExportJobProfile(unlockedJobProfile.jobProfileId, jobProfile);
        },
      );
      ExportJobProfiles.deleteJobProfileViaApi(unlockedJobProfile.jobProfileId);
      ExportJobProfiles.deleteJobProfileViaApi(lockedJobProfile.jobProfileId);
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
        unlockedJobProfile.mappingProfileId,
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(lockedJobProfile.mappingProfileId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1030057 User with "Settings - UI-Data-Export Settings Lock - Edit" capability set is able to edit locked job profile (firebird)',
      { tags: ['criticalPath', 'firebird', 'C1030057'] },
      () => {
        // Step 1: Select existing job profile from Preconditions: unlocked job profile not referenced in an existing export job
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.waitLoading();
        ExportJobProfiles.clickProfileNameFromTheList(unlockedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(unlockedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(false, true);

        // Step 2: Click "Actions" menu button
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuOptions();

        // Step 3: Click on Actions menu => Edit option
        SingleJobProfile.clickEditButton();
        SingleJobProfile.waitLoading(`Edit ${unlockedJobProfile.jobProfileName}`);
        SingleJobProfile.verifyProfileDetailsEditable();
        SingleJobProfile.verifySource(adminSourceRecord);
        SingleJobProfile.verifyLockProfileCheckbox(false, false);
        SingleJobProfile.verifySaveAndCloseButtonDisabled(true);
        SingleJobProfile.verifyCancelButtonDisabled(false);
        SingleJobProfile.verifyXButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          `Data export settings - ${unlockedJobProfile.jobProfileName} - FOLIO`,
        );

        // Step 4: Check "Lock profile" checkbox, Click "Save & close" button
        SingleJobProfile.clickLockProfileCheckbox();
        SingleJobProfile.verifyLockProfileCheckbox(true, false);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${unlockedJobProfile.jobProfileName} has been successfully edited`,
        );

        // Step 5: Verify row with edited job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(unlockedJobProfile.jobProfileName, user, true);

        // Step 6: Click on the row with edited job profile
        ExportJobProfiles.clickProfileNameFromTheList(unlockedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(unlockedJobProfile.jobProfileName);
        SingleJobProfile.verifyViewProfileDetails(
          unlockedJobProfile.jobProfileName,
          unlockedJobProfile.mappingProfileName,
          unlockedJobProfile.description,
        );
        SingleJobProfile.verifyLockProfileCheckbox(true, true);

        // Step 7: Close Job profile view page, Select existing job profile from Preconditions: locked job profile referenced in an existing export job
        SingleJobProfile.clickXButton();
        ExportJobProfiles.clickProfileNameFromTheList(lockedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(lockedJobProfile.jobProfileName);
        SingleJobProfile.verifyElements();
        SingleJobProfile.verifyLockProfileCheckbox(true, true);

        // Step 8: Click "Actions" menu button
        SingleJobProfile.openActions();
        SingleJobProfile.verifyActionsMenuItems({ edit: true, duplicate: true, delete: false });

        // Step 9: Click on Actions menu => Edit option
        SingleJobProfile.clickEditButton();
        SingleJobProfile.waitLoading(`Edit ${lockedJobProfile.jobProfileName}`);
        SingleJobProfile.verifyProfileDetailsEditable();
        SingleJobProfile.verifySource(adminSourceRecord);
        SingleJobProfile.verifyLockProfileCheckbox(true, false);
        SingleJobProfile.verifySaveAndCloseButtonDisabled(true);
        SingleJobProfile.verifyCancelButtonDisabled(false);
        SingleJobProfile.verifyXButtonDisabled(false);
        SettingsDataExport.verifyPageTitle(
          `Data export settings - ${lockedJobProfile.jobProfileName} - FOLIO`,
        );

        // Step 10: Uncheck "Lock profile" checkbox, Make any other changes on the job profile, Click "Save & close" button
        SingleJobProfile.clickLockProfileCheckbox();
        SingleJobProfile.verifyLockProfileCheckbox(false, false);
        SingleJobProfile.verifySaveAndCloseButtonDisabled(false);
        ExportNewJobProfile.saveJobProfile();
        InteractorsTools.checkCalloutMessage(
          `Job profile ${lockedJobProfile.jobProfileName} has been successfully edited`,
        );

        // Step 11: Verify row with edited job profile in "Job profiles" table
        ExportJobProfiles.verifyProfileInTable(lockedJobProfile.jobProfileName, user, false);

        // Step 12: Click on the row with edited job profile
        ExportJobProfiles.clickProfileNameFromTheList(lockedJobProfile.jobProfileName);
        SingleJobProfile.waitLoading(lockedJobProfile.jobProfileName);
        SingleJobProfile.verifyViewProfileDetails(
          lockedJobProfile.jobProfileName,
          lockedJobProfile.mappingProfileName,
          lockedJobProfile.description,
        );
        SingleJobProfile.verifyLockProfileCheckbox(false, true);
      },
    );
  });
});
