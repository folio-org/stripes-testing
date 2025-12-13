import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportViewAllLogs from '../../support/fragments/data-export/dataExportViewAllLogs';
import ExportFile from '../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
let instanceId;
const randomPostfix = getRandomPostfix();
const createdJobProfile = {
  mappingProfileName: `AT_C422224_MappingProfile_${randomPostfix}`,
  jobProfileName: `AT_C422224_JobProfile_${randomPostfix}`,
  mappingProfileId: null,
  jobProfileId: null,
};
const unusedJobProfile = {
  mappingProfileName: `AT_C422224_UnusedMappingProfile_${randomPostfix}`,
  jobProfileName: `AT_C422224_UnusedJobProfile_${randomPostfix}`,
  mappingProfileId: null,
  jobProfileId: null,
};
const folioInstanceTitle = `AT_C422224_FolioInstance_${randomPostfix}`;
const csvFileName = `AT_C422224_instance_${randomPostfix}.csv`;
const defaultJobProfiles = {
  instances: 'Default instances export job profile',
  authority: 'Default authority export job profile',
};

const createJobProfileWithMapping = (profileObject) => {
  return ExportNewFieldMappingProfile.createNewFieldMappingProfileViaApi(
    profileObject.mappingProfileName,
  ).then((response) => {
    profileObject.mappingProfileId = response.body.id;
    return ExportNewJobProfile.createNewJobProfileViaApi(
      profileObject.jobProfileName,
      response.body.id,
    ).then((jobProfileResponse) => {
      profileObject.jobProfileId = jobProfileResponse.body.id;
    });
  });
};

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.dataExportViewOnly.gui, permissions.inventoryAll.gui]).then(
      (userProperties) => {
        user = userProperties;

        createJobProfileWithMapping(createdJobProfile);
        createJobProfileWithMapping(unusedJobProfile);

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title: folioInstanceTitle,
              instanceTypeId: instanceTypeData[0].id,
            },
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, instanceId);

            ExportFile.exportFileViaApi(csvFileName, 'instance', createdJobProfile.jobProfileName);
            ExportFile.exportFileViaApi(csvFileName, 'instance', defaultJobProfiles.instances);
            ExportFile.exportFileViaApi(csvFileName, 'authority', defaultJobProfiles.authority);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    ExportJobProfiles.deleteJobProfileViaApi(createdJobProfile.jobProfileId);
    ExportJobProfiles.deleteJobProfileViaApi(unusedJobProfile.jobProfileId);
    DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(createdJobProfile.mappingProfileId);
    DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(unusedJobProfile.mappingProfileId);
    InventoryInstance.deleteInstanceViaApi(instanceId);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
  });

  it(
    'C422224 Verify filtering by job profile in the "Search & filter" pane on the "View all" screen (firebird)',
    { tags: ['extendedPath', 'firebird', 'C422224'] },
    () => {
      // Step 1: Click "View all" button in the "Logs" main pane
      cy.intercept('GET', '**/data-export/job-profiles?used=true**').as('getUsedJobProfiles');
      DataExportViewAllLogs.openAllJobLogs();
      DataExportViewAllLogs.verifyTableWithResultsExists();
      DataExportViewAllLogs.verifySearchAndFilterPane();
      DataExportViewAllLogs.verifyIDOption();
      DataExportViewAllLogs.verifyRecordSearch();
      DataExportViewAllLogs.verifySearchButton();
      DataExportViewAllLogs.verifySearchButtonIsDisabled();
      DataExportViewAllLogs.verifyResetAllButton();
      DataExportViewAllLogs.verifyResetAllIsDisabled();
      DataExportViewAllLogs.verifyErrorsInExportAccordion();
      DataExportViewAllLogs.verifyErrorsAccordionIsExpanded();
      DataExportViewAllLogs.verifyStartedRunningAccordion();
      DataExportViewAllLogs.verifyStartedRunningIsCollapsed();
      DataExportViewAllLogs.verifyEndedRunningAccordion();
      DataExportViewAllLogs.verifyEndedRunningIsCollapsed();
      DataExportViewAllLogs.verifyJobProfileAccordion();
      DataExportViewAllLogs.verifyJobProfileIsCollapsed();
      DataExportViewAllLogs.verifyUserAccordionIsCollapsed();
      DataExportViewAllLogs.verifyLogsMainPane();
      DataExportViewAllLogs.verifyLogsIcon();
      DataExportViewAllLogs.verifyRecordsFoundText();
      DataExportViewAllLogs.verifyLogsTable();
      DataExportViewAllLogs.verifyPaginatorExists();

      // Step 2: Expand "Job profile" accordion under "Search & filter" pane => Click on "Choose job profile" dropdown
      DataExportViewAllLogs.expandJobProfileAccordion();
      DataExportViewAllLogs.verifyJobProfileDropdownExists();
      DataExportViewAllLogs.clickJobProfileDropdown();
      DataExportViewAllLogs.verifyJobProfileInDropdown(defaultJobProfiles.instances);
      DataExportViewAllLogs.verifyJobProfileInDropdown(defaultJobProfiles.authority);
      DataExportViewAllLogs.verifyJobProfileInDropdown(createdJobProfile.jobProfileName);
      DataExportViewAllLogs.verifyJobProfileNotInDropdown(unusedJobProfile.jobProfileName);

      // Step 3: Check DevTools=> Find "job-profiles?used=true" row => Click on it => Click on "Preview" tab => Expand "jobProfiles" on "Preview" tab
      cy.wait('@getUsedJobProfiles').then((interception) => {
        const response = interception.response.body;

        expect(response).to.have.property('jobProfiles');
        expect(response.jobProfiles).to.be.an('array');
        expect(response.jobProfiles.length).to.be.greaterThan(0);

        response.jobProfiles.forEach((profile) => {
          expect(profile).to.have.property('id');
          expect(profile).to.have.property('name');
        });

        const jobProfileNames = response.jobProfiles.map((profile) => profile.name);
        const jobProfileIds = response.jobProfiles.map((profile) => profile.id);

        expect(jobProfileNames).to.include(defaultJobProfiles.instances);
        expect(jobProfileNames).to.include(defaultJobProfiles.authority);
        expect(jobProfileNames).to.include(createdJobProfile.jobProfileName);
        expect(jobProfileNames).to.not.include(unusedJobProfile.jobProfileName);

        expect(jobProfileIds).to.include(createdJobProfile.jobProfileId);
      });
    },
  );
});
