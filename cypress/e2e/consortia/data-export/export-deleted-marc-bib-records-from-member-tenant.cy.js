import permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import parseMrcFileContentAndVerify, {
  verifyLeaderPositions,
  verify005FieldValue,
  verifyMarcFieldByTag,
} from '../../../support/utils/parseMrcFileContent';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import DateTools from '../../../support/utils/dateTools';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';

let user;
let sourceId;
let exportedFileNameFromDate;
let exportedFileNameToDate;
const currentDate = DateTools.getFormattedDate({ date: new Date() });
const tomorrowDate = DateTools.getDayTomorrowDateForFiscalYear();
const marcFile = {
  marc: 'marcBibFileForC466285.mrc',
  fileName: `testMarcFileC466285.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcFileForLocal = {
  marc: 'marcBibFileForC466285_1.mrc',
  fileName: `testMarcFileC466285_1.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const sharedWithHoldingsTitle = `AT_C466285_SharedWithHoldings_${getRandomPostfix()}`;
const localWithHoldingsTitle = `AT_C466285_LocalWithHoldings_${getRandomPostfix()}`;
const sharedNotDeletedTitle = `AT_C466285_SharedNotDeleted_${getRandomPostfix()}`;
const testData = {
  sharedInstances: [],
  localInstances: [],
  sharedNotDeletedInstance: {},
  consortiaId: '',
};

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        sourceId = folioSource.id;
      });

      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            permissions.inventoryAll.gui,
            permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ],
        });

        // Create shared instance 1: Import in Central tenant, no holdings, delete from Central
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            const instanceId = record.instance.id;
            cy.getInstanceById(instanceId).then((instanceData) => {
              cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                testData.sharedInstances.push({
                  id: instanceId,
                  title: instanceData.title,
                  hrid: instanceData.hrid,
                  srsId: srsRecords?.matchedId,
                  type: 'imported',
                  hasHoldings: false,
                });
                InstanceRecordView.markAsDeletedViaApi(instanceId);
              });
            });
          });
        });

        // Create shared instance 2: Create in Central tenant, add holdings in Member, delete from Member
        cy.createSimpleMarcBibViaAPI(sharedWithHoldingsTitle)
          .then((instanceId) => {
            cy.getInstanceById(instanceId).then((instanceData) => {
              cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                const sharedInstanceIndex =
                  testData.sharedInstances.push({
                    id: instanceId,
                    title: sharedWithHoldingsTitle,
                    hrid: instanceData.hrid,
                    srsId: srsRecords?.matchedId,
                    type: 'created',
                    hasHoldings: true,
                  }) - 1;

                cy.setTenant(Affiliations.College);
                cy.getLocations({ limit: 1 }).then((locations) => {
                  cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId,
                      sourceId,
                      permanentLocationId: locations.id,
                      holdingsTypeId: holdingTypes[0].id,
                    }).then((holding) => {
                      testData.sharedInstances[sharedInstanceIndex].holdingId = holding.id;
                      // Delete from Member tenant
                      InstanceRecordView.markAsDeletedViaApi(instanceId);
                    });
                  });
                });
              });
            });
          })
          .then(() => {
            // Create local instance 3: Import in Member tenant, no holdings, delete from Member
            cy.setTenant(Affiliations.College);
            DataImport.uploadFileViaApi(
              marcFileForLocal.marc,
              marcFileForLocal.fileName,
              marcFileForLocal.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                const instanceId = record.instance.id;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                    testData.localInstances.push({
                      id: instanceId,
                      title: instanceData.title,
                      hrid: instanceData.hrid,
                      srsId: srsRecords?.matchedId,
                      type: 'imported',
                      hasHoldings: false,
                    });
                    InstanceRecordView.markAsDeletedViaApi(instanceId);
                  });
                });
              });
            });

            // Create local instance 4: Create in Member tenant, add holdings, delete from Member
            cy.createSimpleMarcBibViaAPI(localWithHoldingsTitle).then((instanceId) => {
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                  const localInstanceIndex =
                    testData.localInstances.push({
                      id: instanceId,
                      title: localWithHoldingsTitle,
                      hrid: instanceData.hrid,
                      srsId: srsRecords?.matchedId,
                      type: 'created',
                      hasHoldings: true,
                    }) - 1;

                  cy.getLocations({ limit: 1 }).then((locations) => {
                    cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId,
                        sourceId,
                        permanentLocationId: locations.id,
                        holdingsTypeId: holdingTypes[0].id,
                      }).then((holding) => {
                        testData.localInstances[localInstanceIndex].holdingId = holding.id;
                        InstanceRecordView.markAsDeletedViaApi(instanceId);
                      });
                    });
                  });
                });
              });
            });

            // Create shared not-deleted instance: Create in Member, then share to Central
            cy.createSimpleMarcBibViaAPI(sharedNotDeletedTitle).then((instanceId) => {
              cy.getInstanceById(instanceId).then((instanceData) => {
                testData.sharedNotDeletedInstance = {
                  id: instanceId,
                  title: sharedNotDeletedTitle,
                  hrid: instanceData.hrid,
                };

                // Share instance from Member to Central tenant
                InventoryInstance.shareInstanceViaApi(
                  instanceId,
                  testData.consortiaId,
                  Affiliations.College,
                  Affiliations.Consortia,
                );
              });
            });
          });

        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      cy.setTenant(Affiliations.College);
      testData.sharedInstances.forEach((instance) => {
        if (instance.holdingId) {
          cy.deleteHoldingRecordViaApi(instance.holdingId);
        }
      });

      testData.localInstances.forEach((instance) => {
        if (instance.holdingId) {
          cy.deleteHoldingRecordViaApi(instance.holdingId);
        }
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });

      cy.withinTenant(Affiliations.Consortia, () => {
        testData.sharedInstances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        InventoryInstance.deleteInstanceViaApi(testData.sharedNotDeletedInstance.id);
      });

      FileManager.deleteFileFromDownloadsByMask(exportedFileNameFromDate, exportedFileNameToDate);
    });

    it(
      'C466285 ECS | Export deleted MARC bib records from Member tenant (consortia) (firebird)',
      { tags: ['extendedPathECS', 'firebird', 'C466285'] },
      () => {
        // Prepare list of record IDs that should be excluded from exports
        const excludedRecordIds = [
          ...testData.sharedInstances.map((instance) => instance.id),
          testData.sharedNotDeletedInstance.id,
        ];

        // Common assertions for MARC record verification
        const commonAssertions = (instance) => [
          (record) => verifyLeaderPositions(record, { 5: 'd' }),
          (record) => verify005FieldValue(record),
          (record) => {
            verifyMarcFieldByTag(record, '245', {
              ind1: ' ',
              ind2: ' ',
              subfields: [['a', instance.title]],
            });
          },
          (record) => {
            verifyMarcFieldByTag(record, '999', {
              ind1: 'f',
              ind2: 'f',
              subfields: [
                ['i', instance.id],
                ['s', instance.srsId],
              ],
            });
          },
        ];

        // Step 1: Initiate export of deleted MARC bib records from member tenant from today's date
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.runDataExportMarcBibDeleted({ from: currentDate }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.jobExecutionId).to.be.a('string');

          const jobExecutionId = response.body.jobExecutionId;
          cy.wait(3000); // wait for job to be completed

          // Step 2-3: Check the data export job is triggered and completed
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then(({ response: jobResponse }) => {
            const job = jobResponse.body.jobExecutions.find(
              (jobExecution) => jobExecution.id === jobExecutionId,
            );
            exportedFileNameFromDate = job.exportedFiles[0].fileName;
            const recordsCount = job.progress.total;
            const jobId = job.hrId;

            expect(exportedFileNameFromDate).to.include('deleted-marc-bib-records-');
            cy.resetTenant();
            DataExportResults.verifySuccessExportResultCells(
              exportedFileNameFromDate,
              recordsCount,
              jobId,
              Cypress.env('diku_login'),
            );
            cy.getUserToken(user.username, user.password);
            cy.setTenant(Affiliations.College);

            // Step 4: Download the recently created file
            DataExportLogs.clickButtonWithText(exportedFileNameFromDate);

            // Step 5: Check exported records included in the file
            const assertionsOnFileContent = testData.localInstances.map((instance) => ({
              uuid: instance.id,
              assertions: commonAssertions(instance),
            }));

            parseMrcFileContentAndVerify(
              exportedFileNameFromDate,
              assertionsOnFileContent,
              null, // Don't check exact count - other deleted instances may exist
            );

            // Verify shared instances are not included
            ExportFile.verifyMrcFileDoesNotIncludeRecords(
              exportedFileNameFromDate,
              excludedRecordIds,
            );
            DataExportLogs.waitLoading();
            DataExportResults.verifyTableWithResultsExists();
          });
        });

        // Step 6: Initiate export of deleted MARC bib records for all dates until today
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.runDataExportMarcBibDeleted({ to: currentDate }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.jobExecutionId).to.be.a('string');

          const jobExecutionId = response.body.jobExecutionId;

          // Step 7-10: Check the data export job is triggered and completed
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
            'getInfoToDate',
          );
          cy.wait('@getInfoToDate', getLongDelay()).then(({ response: jobResponse }) => {
            const job = jobResponse.body.jobExecutions.find(
              (jobExecution) => jobExecution.id === jobExecutionId,
            );
            exportedFileNameToDate = job.exportedFiles[0].fileName;
            const recordsCount = job.progress.total;
            const jobId = job.hrId;

            expect(exportedFileNameToDate).to.include('deleted-marc-bib-records-');

            cy.resetTenant();
            DataExportResults.verifySuccessExportResultCells(
              exportedFileNameToDate,
              recordsCount,
              jobId,
              Cypress.env('diku_login'),
            );

            cy.getUserToken(user.username, user.password);
            cy.setTenant(Affiliations.College);

            DataExportLogs.clickButtonWithText(exportedFileNameToDate);

            // Verify same results as with "from" parameter
            const assertionsOnFileContentToDate = testData.localInstances.map((instance) => ({
              uuid: instance.id,
              assertions: commonAssertions(instance),
            }));

            parseMrcFileContentAndVerify(
              exportedFileNameToDate,
              assertionsOnFileContentToDate,
              null, // Don't check exact count - other deleted instances may exist
            );

            // Verify shared instances are not included
            ExportFile.verifyMrcFileDoesNotIncludeRecords(
              exportedFileNameToDate,
              excludedRecordIds,
            );
          });
        });
        DataExportLogs.waitLoading();
        DataExportResults.verifyTableWithResultsExists();

        // Step 11: Initiate export for tomorrow date (should fail)
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.runDataExportMarcBibDeleted({
          from: tomorrowDate,
          to: tomorrowDate,
        }).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.jobExecutionId).to.be.a('string');

          const jobExecutionId = response.body.jobExecutionId;

          // Step 12-13: Check the data export job fails
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
            'getFailedJob',
          );
          cy.wait('@getFailedJob', getLongDelay()).then(({ response: jobResponse }) => {
            const job = jobResponse.body.jobExecutions.find(
              (jobExecution) => jobExecution.id === jobExecutionId,
            );
            const jobHrid = job.hrId;
            const failedFileName = job.exportedFiles[0].fileName;
            const jobId = job.hrId;

            expect(job.status).to.equal('FAIL');
            expect(job.progress.total).to.equal(0);
            expect(job.progress.exported).to.equal(0);
            expect(failedFileName).to.eq(`deleted-marc-bib-records-${jobHrid}.mrc`);

            cy.resetTenant();

            DataExportResults.verifyFailedExportResultCells(
              failedFileName,
              0,
              jobId,
              Cypress.env('diku_login'),
              'Default instances',
              true,
            );

            // Step 14: Click on the row with failed data export job
            cy.getUserToken(user.username, user.password);
            cy.setTenant(Affiliations.College);

            DataExportLogs.clickFileNameFromTheList(failedFileName);
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              'ERROR Error while reading from input file with uuids or file is empty',
            );
          });
        });
      },
    );
  });
});
