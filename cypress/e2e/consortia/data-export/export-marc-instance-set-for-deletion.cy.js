import permissions from '../../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import parseMrcFileContentAndVerify, {
  verifyLeaderPositions,
  verify005FieldValue,
  verifyMarcFieldByTag,
  verify001FieldValue,
} from '../../../support/utils/parseMrcFileContent';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

let user;
let downloadedCsvFile;
let exportedInCentralTenantMrcFile;
let exportedInMemberTenantMrcFile;
const randomPostfix = getRandomPostfix();
const marcInstanceIds = [];
const marcInstanceTitles = [];
const marcInstanceSrsIds = [];
const marcInstanceHrids = [];

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C958465');

      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [permissions.dataExportUploadExportDownloadFileViewLogs.gui],
        });

        for (let i = 1; i <= 3; i++) {
          const instanceTitle = `AT_C958465_MarcInstance_${i}_${randomPostfix}`;
          marcInstanceTitles.push(instanceTitle);

          cy.createSimpleMarcBibViaAPI(instanceTitle).then((instanceId) => {
            marcInstanceIds.push(instanceId);

            cy.getInstanceById(instanceId).then((instanceData) => {
              marcInstanceHrids.push(instanceData.hrid);
            });

            cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
              marcInstanceSrsIds.push(srsRecords?.matchedId);
            });

            if (i === 1) {
              // First instance: use markAsDeletedViaApi method
              InstanceRecordView.markAsDeletedViaApi(instanceId);
            } else if (i === 2) {
              // Second instance: set deleted flag along with suppress flags
              cy.getInstanceById(instanceId).then((instanceData) => {
                const updatedInstance = {
                  ...instanceData,
                  deleted: true,
                  discoverySuppress: true,
                  staffSuppress: true,
                };
                cy.updateInstance(updatedInstance);
              });
            } else if (i === 3) {
              // Third instance: update MARC LDR position 05 to 'd'
              cy.getMarcRecordDataViaAPI(instanceId).then((marcRecord) => {
                const updatedLeader = `${marcRecord.leader.substring(0, 5)}d${marcRecord.leader.substring(6)}`;
                const updatedMarcRecord = {
                  ...marcRecord,
                  leader: updatedLeader,
                };
                cy.updateMarcRecordDataViaAPI(marcRecord.parsedRecordId, updatedMarcRecord);
              });
            }
          });
        }

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        InventorySearchAndFilter.byKeywords('AT_C958465_MarcInstance');
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      marcInstanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      FileManager.deleteFileFromDownloadsByMask(
        exportedInCentralTenantMrcFile,
        exportedInMemberTenantMrcFile,
        downloadedCsvFile,
      );
      FileManager.deleteFile(`cypress/fixtures/${downloadedCsvFile}`);
    });

    // Sunflower known issue https://folio-org.atlassian.net/browse/MDEXP-778
    it(
      'C958465 ECS | Verify export MARC Instance set for deletion (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C958465'] },
      () => {
        // Step 1: Click on the "Action" menu, Click "Save instances UUIDs" option
        InventoryInstances.clickSelectAllInstancesCheckbox();
        InventorySearchAndFilter.saveUUIDs();
        cy.wait(3000); // waiting for file to be saved
        FileManager.findDownloadedFilesByMask('SearchInstanceUUIDs*').then(
          (downloadedFilePaths) => {
            const lastDownloadedFilePath =
              downloadedFilePaths.sort()[downloadedFilePaths.length - 1];
            downloadedCsvFile = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);

            // Step 2: Go to the "Data export" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);

            // Step 3-5: Trigger the data export by uploading CSV file and running Default instances export job profile
            ExportFileHelper.moveDownloadedFileToFixtures(downloadedCsvFile);
            ExportFileHelper.uploadFile(downloadedCsvFile);
            ExportFileHelper.exportWithDefaultJobProfile(downloadedCsvFile);

            cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
            cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
              const { jobExecutions } = response.body;
              const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
              const jobId = jobData.hrId;
              exportedInCentralTenantMrcFile = `${downloadedCsvFile.replace('.csv', '')}-${jobId}.mrc`;

              DataExportResults.verifySuccessExportResultCells(
                exportedInCentralTenantMrcFile,
                marcInstanceIds.length,
                jobId,
                user.username,
              );

              cy.getToken(user.username, user.password);

              // Step 6: Download the recently created file by clicking on its name hyperlink
              DataExportLogs.clickButtonWithText(exportedInCentralTenantMrcFile);

              // Step 7: Check exported record for shared Instances from Preconditions #4 included in the file
              // Common assertion function for MARC record verification
              const commonAssertions = (instanceId, srsId, hrid) => [
                (record) => verifyLeaderPositions(record, { 5: 'd' }),
                (record) => verify005FieldValue(record),
                (record) => verify001FieldValue(record, hrid),
                (record) => {
                  verifyMarcFieldByTag(record, '245', {
                    ind1: ' ',
                    ind2: ' ',
                    subfields: ['a', marcInstanceTitles[marcInstanceIds.indexOf(instanceId)]],
                  });
                },
                (record) => {
                  verifyMarcFieldByTag(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: [
                      ['i', instanceId],
                      ['s', srsId],
                    ],
                  });
                },
              ];
              const recordsToVerify = marcInstanceIds.map((id, index) => ({
                uuid: id,
                assertions: commonAssertions(
                  id,
                  marcInstanceSrsIds[index],
                  marcInstanceHrids[index],
                ),
              }));

              parseMrcFileContentAndVerify(
                exportedInCentralTenantMrcFile,
                recordsToVerify,
                marcInstanceIds.length,
              );

              // Step 8: Switch affiliation to member tenant, Go to "Data export" app
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);

              // Step 9-10: Trigger the data export by uploading CSV file and running Default instances export job profile
              ExportFileHelper.uploadFile(downloadedCsvFile);
              ExportFileHelper.exportWithDefaultJobProfile(downloadedCsvFile);

              cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
                'getMemberInfo',
              );
              cy.wait('@getMemberInfo', getLongDelay()).then(({ response: memberResponse }) => {
                const { jobExecutions: memberJobExecutions } = memberResponse.body;
                const memberJobData = memberJobExecutions.find(
                  ({ runBy }) => runBy.userId === user.userId,
                );
                const memberJobId = memberJobData.hrId;
                exportedInMemberTenantMrcFile = `${downloadedCsvFile.replace('.csv', '')}-${memberJobId}.mrc`;

                DataExportResults.verifySuccessExportResultCells(
                  exportedInMemberTenantMrcFile,
                  marcInstanceIds.length,
                  memberJobId,
                  user.username,
                );

                cy.getToken(user.username, user.password);

                // Step 11: Open downloaded ".csv" file via any text editor tool
                cy.readFile(`cypress/fixtures/${downloadedCsvFile}`).then((csvContent) => {
                  const uuidNumbers = csvContent.split('\n').length;

                  expect(uuidNumbers).to.equal(marcInstanceIds.length);

                  marcInstanceIds.forEach((instanceId) => {
                    expect(csvContent).to.include(instanceId);
                  });
                });

                // Step 12: Download the recently created file from member tenant
                DataExportLogs.clickButtonWithText(exportedInMemberTenantMrcFile);

                // Verify files from Central and Member tenants are identical
                FileManager.verifyFilesHaveEqualContent(
                  `cypress/downloads/${exportedInCentralTenantMrcFile}`,
                  `cypress/downloads/${exportedInMemberTenantMrcFile}`,
                  'binary',
                );

                // Step 13: Check exported record for shared Instances included in the file
                const memberRecordsToVerify = marcInstanceIds.map((id, index) => ({
                  uuid: id,
                  assertions: commonAssertions(
                    id,
                    marcInstanceSrsIds[index],
                    marcInstanceHrids[index],
                  ),
                }));

                parseMrcFileContentAndVerify(
                  exportedInMemberTenantMrcFile,
                  memberRecordsToVerify,
                  marcInstanceIds.length,
                );
              });
            });
          },
        );
      },
    );
  });
});
