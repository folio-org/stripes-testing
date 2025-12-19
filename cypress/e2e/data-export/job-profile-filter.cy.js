import permissions from '../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../support/constants';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import DataExportViewAllLogs, {
  accordionNames,
} from '../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';

let user;
let fieldMappingProfileId;
let instanceId;
let adminSourceRecord;
const randomPostfix = getRandomPostfix();
const mappingProfileName = `AT_C411724_MappingProfile_${randomPostfix}`;
const jobProfileName = `AT_C411724_JobProfile_${randomPostfix} export job profile`;
const folioInstanceTitle = `AT_C411724_FolioInstance_${randomPostfix}`;
const csvFileName = `AT_C411724_instance_${randomPostfix}.csv`;

describe('Data Export', () => {
  describe('Job profile - setup', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.getAdminUserDetails().then((record) => {
            adminSourceRecord = record;
          });

          // Create mapping profile and job profile
          ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(mappingProfileName).then(
            (response) => {
              fieldMappingProfileId = response.body.id;
              ExportNewJobProfile.createNewJobProfileViaApi(jobProfileName, response.body.id);
            },
          );
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypeData) => {
              // Create FOLIO instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title: folioInstanceTitle,
                  instanceTypeId: instanceTypeData[0].id,
                },
              }).then((createdInstanceData) => {
                instanceId = createdInstanceData.instanceId;

                // Create CSV file with instance UUID
                FileManager.createFile(`cypress/fixtures/${csvFileName}`, instanceId);
              });
            })
            .then(() => {
              cy.loginAsAdmin({
                path: TopMenu.dataExportPath,
                waiter: DataExportLogs.waitLoading,
              });

              // Upload CSV file and run export
              ExportFileHelper.uploadFile(csvFileName);
              ExportFileHelper.exportWithDefaultJobProfile(
                csvFileName,
                `AT_C411724_JobProfile_${randomPostfix}`,
              );
              cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
                'getJobInfo',
              );
              cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
                const { jobExecutions } = response.body;
                const jobData = jobExecutions.find(
                  ({ runBy }) => runBy.userId === adminSourceRecord.id,
                );
                const jobId = jobData.hrId;
                const totalRecordsCount = 1;
                const resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

                DataExportResults.verifySuccessExportResultCells(
                  resultFileName,
                  totalRecordsCount,
                  jobId,
                  Cypress.env('diku_login'),
                  `AT_C411724_JobProfile_${randomPostfix}`,
                );
              });

              cy.login(user.username, user.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      ExportJobProfiles.getJobProfile({ query: `"name"=="${jobProfileName}"` }).then((response) => {
        ExportJobProfiles.deleteJobProfileViaApi(response.id);
      });
      DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(fieldMappingProfileId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C411724 Job profile filter (firebird)',
      { tags: ['extendedPath', 'firebird', 'C411724'] },
      () => {
        // Step 1: Click on "Data export" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();
        DataExportLogs.verifyUploadFileButtonDisabled(false);
        DataExportLogs.verifyViewAllLogsButtonEnabled();
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportViewAllLogs.verifyLogsTable();

        // Step 2: Click "View all" button on the top of the main pane
        DataExportViewAllLogs.openAllJobLogs();
        DataExportViewAllLogs.verifySearchAndFilterPane();
        DataExportViewAllLogs.verifyJobProfileAccordion();
        DataExportViewAllLogs.verifyIDOption();
        DataExportViewAllLogs.verifyRecordSearch();
        DataExportViewAllLogs.verifySearchButton();
        DataExportViewAllLogs.verifyResetAllButton();
        DataExportViewAllLogs.verifyResetAllIsDisabled();
        DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('Yes', false);
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('No', false);
        DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
        DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
        DataExportViewAllLogs.verifyJobProfileIsCollapsed();
        DataExportViewAllLogs.verifyUserAccordionIsCollapsed();
        DataExportViewAllLogs.verifyLogsTable();
        DataExportLogs.verifyRecordsFoundSubtitleExists();

        // Step 3: Click "Job profile" accordion
        DataExportViewAllLogs.expandAccordion(accordionNames.JOB_PROFILE);
        DataExportViewAllLogs.verifyJobProfileDropdownExists();

        // Step 4: Click on "Choose job profile" dropdown
        DataExportViewAllLogs.clickJobProfileDropdown();
        DataExportViewAllLogs.verifyJobProfileInDropdown(jobProfileName);

        // Step 5: Click on the input text field and enter the exact name of any existing export job profile
        DataExportViewAllLogs.filterJobProfileByName(jobProfileName);
        DataExportViewAllLogs.verifyJobProfileHighlightedInOptionsList(jobProfileName);
        DataExportViewAllLogs.verifyNumberOfFilteredJobProfiles(1);

        // Step 6: Select any job profile
        DataExportViewAllLogs.selectFilterOption(jobProfileName);
        DataExportViewAllLogs.verifyResetAllButtonEnabled();
        DataExportViewAllLogs.verifySearchAndFilterPane();
        DataExportViewAllLogs.verifyJobProfileAccordion();
        DataExportViewAllLogs.verifyIDOption();
        DataExportViewAllLogs.verifyRecordSearch();
        DataExportViewAllLogs.verifySearchButton();
        DataExportViewAllLogs.verifyResetAllButton();
        DataExportViewAllLogs.verifyResetAllIsDisabled(false);
        DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('Yes', false);
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('No', false);
        DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
        DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
        DataExportViewAllLogs.verifyJobProfileIsCollapsed(false);
        DataExportViewAllLogs.verifyUserAccordionIsCollapsed();
        DataExportViewAllLogs.verifyLogsTable();
        DataExportLogs.verifyFoundRecordsCount(1);
        DataExportViewAllLogs.verifyLogsFilteredByJobProfile(jobProfileName);

        // Step 7: Click on "x" next to "Job profile" accordion
        DataExportViewAllLogs.clickClearJobProfileFilter();
        DataExportViewAllLogs.verifyResetAllIsDisabled();
        // TODO: Uncomment after behavior will be clarified
        // DataExportViewAllLogs.verifyJobProfileDropdownExists();
        DataExportLogs.verifyRecordsFoundSubtitleExists();

        // Step 8: Click on "Choose job profile" dropdown - Type non-existing option into the text field
        DataExportViewAllLogs.clickJobProfileDropdown();
        DataExportViewAllLogs.filterJobProfileByName('non-existing');
        DataExportViewAllLogs.verifyValueNotInList();

        // Step 9: Click on "Choose job profile" filter - Select any job profile
        DataExportViewAllLogs.filterJobProfileByName(jobProfileName);
        DataExportViewAllLogs.selectFilterOption(jobProfileName);
        DataExportViewAllLogs.verifyResetAllButtonEnabled();
        DataExportViewAllLogs.verifySearchAndFilterPane();
        DataExportViewAllLogs.verifyJobProfileAccordion();
        DataExportViewAllLogs.verifyIDOption();
        DataExportViewAllLogs.verifyRecordSearch();
        DataExportViewAllLogs.verifySearchButton();
        DataExportViewAllLogs.verifyResetAllButton();
        DataExportViewAllLogs.verifyResetAllIsDisabled(false);
        DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('Yes', false);
        DataExportViewAllLogs.verifyErrorsInExportCheckbox('No', false);
        DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
        DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
        DataExportViewAllLogs.verifyJobProfileIsCollapsed(false);
        DataExportViewAllLogs.verifyUserAccordionIsCollapsed();
        DataExportViewAllLogs.verifyLogsTable();
        DataExportLogs.verifyFoundRecordsCount(1);

        // Step 10: Click "Reset all" button in "Search & filter" pane
        DataExportViewAllLogs.resetAll();
        DataExportViewAllLogs.verifyResetAllIsDisabled();
        DataExportViewAllLogs.verifyClearFilterButtonExists(false);
        // TODO: Uncomment after behavior will be clarified
        // DataExportViewAllLogs.verifyJobProfileDropdownExists();
        DataExportViewAllLogs.verifyLogsTable();
        DataExportLogs.verifyRecordsFoundSubtitleExists();
      },
    );
  });
});
