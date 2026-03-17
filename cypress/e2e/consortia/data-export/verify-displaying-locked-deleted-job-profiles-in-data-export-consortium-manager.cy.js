import permissions from '../../../support/dictionary/permissions';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportViewAllLogs, {
  accordionNames,
} from '../../../support/fragments/data-export/dataExportViewAllLogs';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import SingleJobProfile from '../../../support/fragments/data-export/exportJobProfile/singleJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import SettingsDataExport from '../../../support/fragments/data-export/settingsDataExport';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import DataExport from '../../../support/fragments/consortium-manager/dataExport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { tenantNames } from '../../../support/dictionary/affiliations';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let adminSourceRecord;
let instanceId;
let completedJobData;
let errorsJobData;
let completedWithErrorsJobData;
let exportedFileNameCompleted;
let exportedFileNameErrors;
let exportedFileNameCompletedWithErrors;

const postfix = getRandomPostfix();
const unlockedJobProfileBaseName = `AT_C1045408_UnlockedJobProfile_${postfix}`;
const lockedJobProfileBaseName = `AT_C1045408_LockedJobProfile_${postfix}`;

const unlockedJobProfile = {
  mappingProfileName: `AT_C1045408_UnlockedMappingProfile_${postfix}`,
  jobProfileName: `${unlockedJobProfileBaseName} export job profile`,
  mappingProfileId: null,
  jobProfileId: null,
};

const lockedJobProfile = {
  mappingProfileName: `AT_C1045408_LockedMappingProfile_${postfix}`,
  jobProfileName: `${lockedJobProfileBaseName} export job profile`,
  mappingProfileId: null,
  jobProfileId: null,
};

const folioInstanceTitle = `AT_C1045408_FolioInstance_${getRandomPostfix()}`;
const csvFileNameCompleted = `AT_C1045408_completed_${getRandomPostfix()}.csv`;
const csvFileNameErrors = `AT_C1045408_errors_${getRandomPostfix()}.csv`;
const csvFileNameCompletedWithErrors = `AT_C1045408_completed_with_errors_${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.getAdminUserDetails().then((record) => {
        adminSourceRecord = record;
      });
      cy.createTempUser([
        permissions.dataExportViewAddUpdateProfiles.gui,
        permissions.dataExportLockUnlockProfiles.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.consortiaSettingsConsortiumManagerView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create unlocked job profile
        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          unlockedJobProfile.mappingProfileName,
        ).then((response) => {
          unlockedJobProfile.mappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(
            unlockedJobProfile.jobProfileName,
            response.body.id,
            false, // unlocked
          ).then((jobResponse) => {
            unlockedJobProfile.jobProfileId = jobResponse.body.id;
          });
        });

        // Create locked job profile
        ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
          lockedJobProfile.mappingProfileName,
        ).then((response) => {
          lockedJobProfile.mappingProfileId = response.body.id;

          ExportNewJobProfile.createNewJobProfileViaApi(
            lockedJobProfile.jobProfileName,
            response.body.id,
            true, // locked
          ).then((jobResponse) => {
            lockedJobProfile.jobProfileId = jobResponse.body.id;
          });
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title: folioInstanceTitle,
              instanceTypeId: instanceTypeData[0].id,
            },
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;

            // Create CSV files for different scenarios
            FileManager.createFile(`cypress/fixtures/${csvFileNameCompleted}`, instanceId);
            FileManager.createFile(`cypress/fixtures/${csvFileNameErrors}`, 'invalid-uuid-123');
            FileManager.createFile(
              `cypress/fixtures/${csvFileNameCompletedWithErrors}`,
              `${instanceId}\ninvalid-uuid-456`,
            );

            // Run export jobs to create logs with different statuses
            // Completed export with unlocked profile
            ExportFile.exportFileViaApi(
              csvFileNameCompleted,
              'instance',
              unlockedJobProfile.jobProfileName,
            ).then((jobData) => {
              completedJobData = jobData;
              exportedFileNameCompleted = `${csvFileNameCompleted.replace('.csv', '')}-${jobData.hrId}.mrc`;
            });

            // Failed export with locked profile
            ExportFile.exportFileViaApi(
              csvFileNameErrors,
              'instance',
              lockedJobProfile.jobProfileName,
            ).then((jobData) => {
              errorsJobData = jobData;
              exportedFileNameErrors = `${csvFileNameErrors.replace('.csv', '')}-${jobData.hrId}.mrc`;
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();

      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
        unlockedJobProfile.mappingProfileId,
      );
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(lockedJobProfile.mappingProfileId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileNameCompleted}`);
      FileManager.deleteFile(`cypress/fixtures/${csvFileNameErrors}`);
      FileManager.deleteFile(`cypress/fixtures/${csvFileNameCompletedWithErrors}`);
    });

    it(
      'C1045408 ECS | Verify displaying locked and deleted job profiles in "Data export" and "Consortium manager" apps (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C1045408'] },
      () => {
        // Step 1: Click "or choose file" button at "Jobs" pane and upload .csv file from Preconditions
        ExportFile.uploadFile(csvFileNameCompletedWithErrors);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Verify columns in the table with job profiles
        SelectJobProfile.verifyTableColumns();

        // Step 3: Verify values in "Status" column for the job profiles from Preconditions
        SelectJobProfile.verifyJobProfileStatus(unlockedJobProfile.jobProfileName, '');
        SelectJobProfile.verifyJobProfileStatus(lockedJobProfile.jobProfileName, 'Locked');

        // Step 4: Run unlocked job profile from Preconditions by clicking on it > Specify record type > Click "Run" button
        SelectJobProfile.selectJobProfile(unlockedJobProfile.jobProfileName);
        SelectJobProfile.selectRecordType('Instances');
        SelectJobProfile.clickRunButton();
        DataExportLogs.verifyFileExistsInLogs(unlockedJobProfile.jobProfileName);
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');

        DataExportLogs.waitLoading();

        // Capture the job data from the UI-run export (run by current user)
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          completedWithErrorsJobData = jobData;
          exportedFileNameCompletedWithErrors = `${csvFileNameCompletedWithErrors.replace('.csv', '')}-${jobData.hrId}.mrc`;

          // Step 5: Trigger few more data export jobs to have run jobs with unlocked, locked job profiles from Preconditions in different status
          // Verify completed export with unlocked profile (run by admin via API)
          DataExportResults.verifySuccessExportResultCells(
            exportedFileNameCompleted,
            1,
            completedJobData.hrId,
            adminSourceRecord.username,
            unlockedJobProfileBaseName,
          );

          // Verify failed export with locked profile (0 exported, 1 failed - all invalid UUIDs, run by admin via API)
          DataExportResults.verifyFailedExportResultCells(
            exportedFileNameErrors,
            1,
            errorsJobData.hrId,
            adminSourceRecord.username,
            lockedJobProfileBaseName,
          );
          cy.getUserToken(user.username, user.password);

          // Verify completed with errors export with unlocked profile (1 valid + 1 invalid UUID: 1 exported, 1 failed, run by current user via UI)
          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            exportedFileNameCompletedWithErrors,
            2,
            1,
            completedWithErrorsJobData.hrId,
            user,
            unlockedJobProfileBaseName,
          );

          // Step 6: Click "View All" button > Verify values in "Job profile" filter under "Search & filter" pane for the job profiles from Preconditions
          DataExportViewAllLogs.openAllJobLogs();
          DataExportViewAllLogs.expandAccordion(accordionNames.JOB_PROFILE);
          DataExportViewAllLogs.clickJobProfileDropdown();
          DataExportViewAllLogs.verifyJobProfileInDropdown(unlockedJobProfile.jobProfileName);
          DataExportViewAllLogs.verifyJobProfileInDropdown(lockedJobProfile.jobProfileName);

          // Step 7: Go to the "Settings" > "Data export" > "Job profiles" page > Delete unlocked job profile from Preconditions > Unlock and delete locked job profile from Preconditions
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsDataExport.goToSettingsDataExport();
          ExportJobProfiles.goToJobProfilesTab();

          // Delete unlocked job profile
          ExportJobProfiles.clickProfileNameFromTheList(unlockedJobProfile.jobProfileName);
          SingleJobProfile.waitLoading(unlockedJobProfile.jobProfileName);
          SingleJobProfile.openActions();
          SingleJobProfile.clickDeleteButton();
          SingleJobProfile.confirmDeletion();
          InteractorsTools.checkCalloutMessage(
            `Job profile ${unlockedJobProfile.jobProfileName} has been successfully deleted`,
          );

          // Unlock and delete locked job profile
          ExportJobProfiles.clickProfileNameFromTheList(lockedJobProfile.jobProfileName);
          SingleJobProfile.waitLoading(lockedJobProfile.jobProfileName);
          SingleJobProfile.openActions();
          SingleJobProfile.clickEditButton();
          ExportNewJobProfile.clickLockProfileCheckbox();
          ExportNewJobProfile.saveJobProfile();
          InteractorsTools.checkCalloutMessage(
            `Job profile ${lockedJobProfile.jobProfileName} has been successfully edited`,
          );
          ExportJobProfiles.clickProfileNameFromTheList(lockedJobProfile.jobProfileName);
          SingleJobProfile.openActions();
          SingleJobProfile.clickDeleteButton();
          SingleJobProfile.confirmDeletion();
          InteractorsTools.checkCalloutMessage(
            `Job profile ${lockedJobProfile.jobProfileName} has been successfully deleted`,
          );

          // Step 8: Go back to "Data export" app > Click "or choose file" button at "Jobs" pane and upload .csv file from Preconditions
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();
          ExportFile.uploadFile(csvFileNameCompletedWithErrors);
          SelectJobProfile.verifySelectJobPane();

          // Verify deleted job profiles don't appear in the modal
          SelectJobProfile.verifyJobProfileAbsentInModal(unlockedJobProfile.jobProfileName);
          SelectJobProfile.verifyJobProfileAbsentInModal(lockedJobProfile.jobProfileName);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);

          // Step 9: Click "Data export" button in the header > Verify data export jobs with deleted unlocked, locked job profiles from Preconditions in different status
          // Verify unlocked job profile shows as (deleted)
          DataExportLogs.verifyDeletedJobProfileNotation(unlockedJobProfile.jobProfileName);
          DataExportLogs.verifyFileNameReadOnly(exportedFileNameCompleted);
          DataExportLogs.verifyFileNameReadOnly(exportedFileNameCompletedWithErrors);

          // Verify locked job profile shows as (deleted)
          DataExportLogs.verifyDeletedJobProfileNotation(lockedJobProfile.jobProfileName);
          DataExportLogs.verifyFileNameReadOnly(exportedFileNameErrors);

          // Verify error logs don't open when clicking rows with errors for deleted profiles
          DataExportLogs.verifyErrorLogsDoNotOpen(exportedFileNameErrors);

          // Step 10: Click "View All" button > Verify values in "Job profile" filter under "Search & filter" pane for the deleted job profiles from Preconditions
          DataExportViewAllLogs.openAllJobLogs();
          DataExportViewAllLogs.expandAccordion(accordionNames.JOB_PROFILE);
          DataExportViewAllLogs.clickJobProfileDropdown();
          DataExportViewAllLogs.verifyJobProfileNotInDropdown(unlockedJobProfile.jobProfileName);
          DataExportViewAllLogs.verifyJobProfileNotInDropdown(lockedJobProfile.jobProfileName);

          // Step 11: Go to "Consortium manager" app > Click "Data export" in "Management" pane under "Logs & Reports" section > Select Central tenant in "Member" dropdown
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.waitLoading();
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.dataExport);
          ConsortiumManagerApp.verifySelectedSettingIsDisplayed(settingsItems.dataExport);
          ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.central);
          ConsortiumManagerApp.verifySelectedMember(tenantNames.central);

          // Verify data export jobs with deleted unlocked, locked job profiles from Preconditions in different status
          DataExport.verifyDeletedJobProfileNotationInConsortiumManager(
            unlockedJobProfile.jobProfileName,
          );
          DataExport.verifyDeletedJobProfileNotationInConsortiumManager(
            lockedJobProfile.jobProfileName,
          );
          DataExport.verifyFileNameReadOnlyInConsortiumManager(exportedFileNameCompleted);
          DataExport.verifyFileNameReadOnlyInConsortiumManager(exportedFileNameErrors);
          DataExport.verifyFileNameReadOnlyInConsortiumManager(exportedFileNameCompletedWithErrors);
          DataExport.verifyErrorLogsDoNotOpenInConsortiumManager(exportedFileNameErrors);
        });
      },
    );
  });
});
