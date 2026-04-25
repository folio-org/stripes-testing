import permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
const userPermissons = [
  permissions.dataExportUploadExportDownloadFileViewLogs.gui,
  permissions.inventoryAll.gui,
];
const sliceSizes = {
  central: 3,
  college: 5,
  university: 10,
};
const defaultSliceSize = 100000;
const totalInstances = 15;
const expectedInstances = [];
const csvFileName = `AT_C432318_instancesUUIDs_${getRandomPostfix()}.csv`;
const jobProfileName = 'Default instances';

describe('Data Export', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      cy.createTempUser(userPermissons).then((userProperties) => {
        user = userProperties;

        // Affiliate user to member tenants
        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: userPermissons,
        });

        cy.affiliateUserToTenant({
          tenantId: Affiliations.University,
          userId: user.userId,
          permissions: userPermissons,
        });

        // Get instance type ID
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          const instanceTypeId = instanceTypes[0].id;

          // Create shared instances in Consortia tenant
          const instancePromises = [];
          for (let i = 0; i < totalInstances; i++) {
            const instanceTitle = `AT_C432318_SharedInstance_${i}_${getRandomPostfix()}`;
            const promise = InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instanceTitle,
              },
            }).then((instance) => {
              expectedInstances.push(instance.instanceId);
            });
            instancePromises.push(promise);
          }

          return Promise.all(instancePromises);
        });

        // Configure different slice_size for each tenant
        cy.resetTenant();
        cy.configureDataExportFileLimit('slice_size', sliceSizes.central);

        cy.setTenant(Affiliations.College);
        cy.configureDataExportFileLimit('slice_size', sliceSizes.college);

        cy.setTenant(Affiliations.University);
        cy.configureDataExportFileLimit('slice_size', sliceSizes.university);

        // Create CSV file with instance UUIDs
        cy.then(() => {
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, expectedInstances.join('\n'));
        });

        // Login and navigate to Data Export app
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.configureDataExportFileLimit('slice_size', defaultSliceSize);
      cy.setTenant(Affiliations.College);
      cy.configureDataExportFileLimit('slice_size', defaultSliceSize);
      cy.setTenant(Affiliations.University);
      cy.configureDataExportFileLimit('slice_size', defaultSliceSize);

      // Delete shared instances
      cy.withinTenant(Affiliations.Consortia, () => {
        expectedInstances.forEach((instanceId) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        });
      });

      // Delete CSV file
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);

      // Delete downloaded zip files
      FileManager.deleteFilesFromDownloadsByMask('AT_C432318_*.zip');

      // Delete user
      cy.resetTenant();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C432318 ECS | Verify different configured limit of exported file size on tenants (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C432318'] },
      () => {
        // Step 1-4: Test export from Central tenant
        ExportFileHelper.uploadFile(csvFileName);
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName, jobProfileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getCentralExport',
        );
        cy.wait('@getCentralExport', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const exportedFile = csvFileName.replace('.csv', '');
          const jobData = jobExecutions.find((job) => {
            return job.exportedFiles[0].fileName.includes(exportedFile);
          });
          const centralExportFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.zip`;

          DataExportResults.verifySuccessExportResultCells(
            centralExportFileName,
            totalInstances,
            jobData.hrId,
            user.username,
            jobProfileName,
          );
          cy.getUserToken(user.username, user.password);

          // Download and verify zip file
          DataExportLogs.clickButtonWithText(centralExportFileName);

          // Verify zip contains 5 files (15÷3)
          ExportFileHelper.verifyZipFileContents(
            centralExportFileName,
            totalInstances,
            sliceSizes.central,
          );
        });

        // Step 5-8: Switch to Member-1 (College) and test export
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        ExportFileHelper.uploadFile(csvFileName);
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName, jobProfileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getCollegeExport',
        );
        cy.wait('@getCollegeExport', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const exportedFile = csvFileName.replace('.csv', '');
          const jobData = jobExecutions.find((job) => {
            return job.exportedFiles[0].fileName.includes(exportedFile);
          });
          const collegeExportFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.zip`;

          DataExportResults.verifySuccessExportResultCells(
            collegeExportFileName,
            totalInstances,
            jobData.hrId,
            user.username,
            jobProfileName,
          );
          cy.getUserToken(user.username, user.password);

          // Download and verify zip file
          DataExportLogs.clickButtonWithText(collegeExportFileName);

          // Verify zip contains 3 files (15÷5)
          ExportFileHelper.verifyZipFileContents(
            collegeExportFileName,
            totalInstances,
            sliceSizes.college,
          );
        });

        // Step 9-12: Switch to Member-2 (University) and test export
        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

        ExportFileHelper.uploadFile(csvFileName);
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName, jobProfileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getUniversityExport',
        );
        cy.wait('@getUniversityExport', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const exportedFile = csvFileName.replace('.csv', '');
          const jobData = jobExecutions.find((job) => {
            return job.exportedFiles[0].fileName.includes(exportedFile);
          });
          const universityExportFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.zip`;

          DataExportResults.verifySuccessExportResultCells(
            universityExportFileName,
            totalInstances,
            jobData.hrId,
            user.username,
            jobProfileName,
          );
          cy.getUserToken(user.username, user.password);

          // Download and verify zip file
          DataExportLogs.clickButtonWithText(universityExportFileName);

          // Verify zip contains 2 files (15÷10)
          ExportFileHelper.verifyZipFileContents(
            universityExportFileName,
            totalInstances,
            sliceSizes.university,
          );
        });
      },
    );
  });
});
