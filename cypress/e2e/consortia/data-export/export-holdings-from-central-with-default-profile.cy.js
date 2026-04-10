import permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify, {
  verifyMarcFieldByTag,
  verify001FieldValue,
} from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
let jobId;
let failedFileName;
const postfix = getRandomPostfix();
const csvFileName = `holdingsUUIDs_${postfix}.csv`;
const duplicatedCsvFileName = `holdingsUUIDs_duplicated_${postfix}.csv`;
const instances = [
  {
    title: `AT_C468213_SharedMARC_${getRandomPostfix()}`,
    type: 'marc',
    shared: true,
    holdingsCollege: [],
    holdingsUniversity: [],
  },
  {
    title: `AT_C468213_SharedFOLIO_${getRandomPostfix()}`,
    type: 'folio',
    shared: true,
    holdingsCollege: [],
    holdingsUniversity: [],
  },
  {
    title: `AT_C468213_LocalMARC_${getRandomPostfix()}`,
    type: 'marc',
    shared: false,
    holdingsCollege: [],
  },
  {
    title: `AT_C468213_LocalFOLIO_${getRandomPostfix()}`,
    type: 'folio',
    shared: false,
    holdingsCollege: [],
  },
];

const testData = {
  locationId: null,
  loanTypeId: null,
  materialTypeId: null,
  sourceId: null,
  instanceTypeId: null,
};

describe('Data Export', () => {
  describe('Consortia', () => {
    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: [permissions.uiInventoryViewInstances.gui],
          });
          cy.affiliateUserToTenant({
            tenantId: Affiliations.University,
            userId: user.userId,
            permissions: [
              permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              permissions.uiInventoryViewInstances.gui,
            ],
          });

          cy.withinTenant(Affiliations.College, () => {
            cy.getLocations({ limit: 1 }).then((res) => {
              testData.locationId = res.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              testData.loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1 }).then((res) => {
              testData.materialTypeId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.sourceId = folioSource.id;
            });
          });

          cy.withinTenant(Affiliations.Consortia, () => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              testData.instanceTypeId = instanceTypes[0].id;

              const marcInstanceFields = [
                {
                  tag: '008',
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: '245',
                  content: `$a ${instances[0].title}`,
                  indicators: ['0', '0'],
                },
              ];

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                instances[0].uuid = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  instances[0].hrid = instanceData.hrid;
                });
              });

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: instances[1].title,
                },
              }).then((createdInstanceData) => {
                instances[1].uuid = createdInstanceData.instanceId;
                cy.getInstanceById(instances[1].uuid).then((instanceData) => {
                  instances[1].hrid = instanceData.hrid;
                });
              });
            });
          });

          cy.then(() => {
            cy.withinTenant(Affiliations.College, () => {
              const localMarcFields = [
                {
                  tag: '008',
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: '245',
                  content: `$a ${instances[2].title}`,
                  indicators: ['0', '0'],
                },
              ];

              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                localMarcFields,
              ).then((instanceId) => {
                instances[2].uuid = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  instances[2].hrid = instanceData.hrid;
                });
              });

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: instances[3].title,
                },
              }).then((createdInstanceData) => {
                instances[3].uuid = createdInstanceData.instanceId;
                cy.getInstanceById(instances[3].uuid).then((instanceData) => {
                  instances[3].hrid = instanceData.hrid;
                });
              });

              cy.getLocations({ limit: 1 }).then((location) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instances[0].uuid,
                  sourceId: testData.sourceId,
                  permanentLocationId: testData.locationId,
                }).then((holding) => {
                  instances[0].holdingsCollege.push({
                    id: holding.id,
                    hrid: holding.hrid,
                    type: 'folio',
                  });
                });

                cy.createMarcHoldingsViaAPI(instances[0].uuid, [
                  {
                    content: instances[0].hrid,
                    tag: '004',
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: '008',
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: '852',
                  },
                ]).then((marcHoldingId) => {
                  cy.getHoldings({ limit: 1, query: `"id"=="${marcHoldingId}"` }).then(
                    (holdingsRecords) => {
                      instances[0].holdingsCollege.push({
                        id: marcHoldingId,
                        hrid: holdingsRecords[0].hrid,
                        type: 'marc',
                      });
                    },
                  );
                });

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instances[1].uuid,
                  sourceId: testData.sourceId,
                  permanentLocationId: testData.locationId,
                }).then((holding) => {
                  instances[1].holdingsCollege.push({
                    id: holding.id,
                    hrid: holding.hrid,
                    type: 'folio',
                  });
                });

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instances[2].uuid,
                  sourceId: testData.sourceId,
                  permanentLocationId: testData.locationId,
                }).then((holding) => {
                  instances[2].holdingsCollege.push({
                    id: holding.id,
                    hrid: holding.hrid,
                    type: 'folio',
                  });
                });

                cy.createMarcHoldingsViaAPI(instances[2].uuid, [
                  {
                    content: instances[2].hrid,
                    tag: '004',
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: '008',
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: '852',
                  },
                ]).then((marcHoldingId) => {
                  cy.getHoldings({ limit: 1, query: `"id"=="${marcHoldingId}"` }).then(
                    (holdingsRecords) => {
                      instances[2].holdingsCollege.push({
                        id: marcHoldingId,
                        hrid: holdingsRecords[0].hrid,
                        type: 'marc',
                      });
                    },
                  );
                });

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instances[3].uuid,
                  sourceId: testData.sourceId,
                  permanentLocationId: testData.locationId,
                }).then((holding) => {
                  instances[3].holdingsCollege.push({
                    id: holding.id,
                    hrid: holding.hrid,
                    type: 'folio',
                  });
                });
              });
            });
          });

          cy.withinTenant(Affiliations.University, () => {
            cy.getLocations({ limit: 1 }).then((location) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instances[0].uuid,
                sourceId: testData.sourceId,
                permanentLocationId: testData.locationId,
              }).then((holding) => {
                instances[0].holdingsUniversity.push({
                  id: holding.id,
                  hrid: holding.hrid,
                  type: 'folio',
                });
              });

              cy.createMarcHoldingsViaAPI(instances[0].uuid, [
                {
                  content: instances[0].hrid,
                  tag: '004',
                },
                {
                  content: QuickMarcEditor.defaultValid008HoldingsValues,
                  tag: '008',
                },
                {
                  content: `$b ${location.code}`,
                  indicators: ['\\', '\\'],
                  tag: '852',
                },
              ]).then((marcHoldingId) => {
                cy.getHoldings({ limit: 1, query: `"id"=="${marcHoldingId}"` }).then(
                  (holdingsRecords) => {
                    instances[0].holdingsUniversity.push({
                      id: marcHoldingId,
                      hrid: holdingsRecords[0].hrid,
                      type: 'marc',
                    });
                  },
                );
              });

              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instances[1].uuid,
                sourceId: testData.sourceId,
                permanentLocationId: testData.locationId,
              }).then((holding) => {
                instances[1].holdingsUniversity.push({
                  id: holding.id,
                  hrid: holding.hrid,
                  type: 'folio',
                });
              });
            });
          });

          cy.then(() => {
            const allHoldingIds = [
              ...instances[0].holdingsCollege.map((h) => h.id),
              ...instances[0].holdingsUniversity.map((h) => h.id),
              ...instances[1].holdingsCollege.map((h) => h.id),
              ...instances[1].holdingsUniversity.map((h) => h.id),
              // TODO: Uncomment when MDEXP-776 is done
              // ...instances[2].holdingsCollege.map((h) => h.id),
              // ...instances[3].holdingsCollege.map((h) => h.id),
            ];

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, allHoldingIds.join('\n'));

            cy.login(user.username, user.password, {
              path: TopMenu.dataExportPath,
              waiter: DataExportLogs.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        },
      );
    });

    after('delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      cy.withinTenant(Affiliations.College, () => {
        instances.forEach((instance) => {
          if (instance.holdingsCollege) {
            instance.holdingsCollege.forEach((holding) => {
              cy.deleteHoldingRecordViaApi(holding.id);
            });
          }
        });

        InventoryInstance.deleteInstanceViaApi(instances[2].uuid);
        InventoryInstance.deleteInstanceViaApi(instances[3].uuid);
      });

      cy.withinTenant(Affiliations.University, () => {
        instances.forEach((instance) => {
          if (instance.holdingsUniversity) {
            instance.holdingsUniversity.forEach((holding) => {
              cy.deleteHoldingRecordViaApi(holding.id);
            });
          }
        });
      });

      InventoryInstance.deleteInstanceViaApi(instances[0].uuid);
      InventoryInstance.deleteInstanceViaApi(instances[1].uuid);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${duplicatedCsvFileName}`);
      if (exportedFileName) {
        FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      }
      if (failedFileName) {
        FileManager.deleteFileFromDownloadsByMask(failedFileName);
      }
    });

    it(
      'C468213 ECS | Export Holdings from Central tenant with default profile (file with Holdings UUIDs) (consortia) (firebird)',
      { tags: ['criticalPathECS', 'firebird', 'C468213'] },
      () => {
        // Step 1: Upload .csv file with Holdings UUIDs
        ExportFile.uploadFile(csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2-3: Run the "Default holdings export job profile" by clicking on it
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          jobId = jobData.hrId;
          exportedFileName = jobData.exportedFiles[0].fileName;

          const expectedExportedCount = 6;

          // Step 4: Verify the export job completed successfully
          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            expectedExportedCount,
            jobId,
            user.username,
            'Default holdings',
          );
          cy.resetTenant();
          cy.getUserToken(user.username, user.password);

          // Step 5: Download the exported file by clicking on its name
          DataExportLogs.clickButtonWithText(exportedFileName);

          const expectedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;
          expect(exportedFileName).to.equal(expectedFileName);

          // Step 6: Verify that only shared Holdings records are exported
          const sharedHoldingIds = [
            ...instances[0].holdingsCollege.map((h) => h.id),
            ...instances[0].holdingsUniversity.map((h) => h.id),
            ...instances[1].holdingsCollege.map((h) => h.id),
            ...instances[1].holdingsUniversity.map((h) => h.id),
          ];

          // TODO: Uncomment when MDEXP-776 is done
          //   const localHoldingIds = [
          //     ...instances[2].holdingsCollege.map((h) => h.id),
          //     ...instances[3].holdingsCollege.map((h) => h.id),
          //   ];

          sharedHoldingIds.forEach((holdingId) => {
            ExportFile.verifyFileIncludes(exportedFileName, [holdingId]);
          });

          // TODO: Uncomment when MDEXP-776 is done
          //   localHoldingIds.forEach((holdingId) => {
          //     ExportFile.verifyFileIncludes(exportedFileName, [holdingId], false);
          //   });

          const recordsToVerify = sharedHoldingIds.map((holdingId) => {
            const holding =
              instances[0].holdingsCollege.find((h) => h.id === holdingId) ||
              instances[0].holdingsUniversity.find((h) => h.id === holdingId) ||
              instances[1].holdingsCollege.find((h) => h.id === holdingId) ||
              instances[1].holdingsUniversity.find((h) => h.id === holdingId);

            return {
              uuid: holdingId,
              assertions: [
                (record) => verify001FieldValue(record, holding.hrid),
                (record) => {
                  verifyMarcFieldByTag(record, '852', {
                    ind1: ' ',
                    ind2: ' ',
                  });
                },
                (record) => {
                  verifyMarcFieldByTag(record, '999', {
                    ind1: 'f',
                    ind2: 'f',
                    subfields: ['i', holdingId],
                  });
                },
              ],
            };
          });

          parseMrcFileContentAndVerify(
            exportedFileName,
            recordsToVerify,
            expectedExportedCount,
            false,
          );
        });

        // Step 7: Remove College affiliation from user, Remove inventory permissions for University tenant
        cy.logout();
        cy.resetTenant();
        cy.getAdminToken();
        cy.removeAffiliationFromUser(Affiliations.College, user.userId);
        cy.withinTenant(Affiliations.University, () => {
          cy.updateCapabilitiesForUserApi(user.userId, []);
          cy.assignCapabilitiesToExistingUser(user.userId, [], [CapabilitySets.uiDataExportEdit]);
        });

        // Create duplicated CSV file
        const duplicatedHoldingIds = [
          ...instances[0].holdingsCollege.map((h) => h.id),
          ...instances[0].holdingsUniversity.map((h) => h.id),
          ...instances[1].holdingsCollege.map((h) => h.id),
          ...instances[1].holdingsUniversity.map((h) => h.id),
          // TODO: Uncomment when MDEXP-776 is done
          // ...instances[2].holdingsCollege.map((h) => h.id),
          // ...instances[3].holdingsCollege.map((h) => h.id),
          ...instances[0].holdingsCollege.map((h) => h.id),
          ...instances[0].holdingsUniversity.map((h) => h.id),
          ...instances[1].holdingsCollege.map((h) => h.id),
          ...instances[1].holdingsUniversity.map((h) => h.id),
          // TODO: Uncomment when MDEXP-776 is done
          // ...instances[2].holdingsCollege.map((h) => h.id),
          // ...instances[3].holdingsCollege.map((h) => h.id),
        ];

        FileManager.createFile(
          `cypress/fixtures/${duplicatedCsvFileName}`,
          duplicatedHoldingIds.join('\n'),
        );
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        cy.wait(20000);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

        // Step 8: Upload duplicated CSV file
        ExportFile.uploadFile(duplicatedCsvFileName);
        SelectJobProfile.verifySelectJobPane();
        ExportFile.exportWithDefaultJobProfile(duplicatedCsvFileName, 'Default holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getFailedJobInfo',
        );
        cy.wait('@getFailedJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const failedJobData = jobExecutions.find(
            ({ runBy, status }) => runBy.userId === user.userId && status === 'FAIL',
          );
          const failedJobId = failedJobData.hrId;
          failedFileName = `${duplicatedCsvFileName.replace('.csv', '')}-${failedJobId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            failedFileName,
            12,
            failedJobId,
            user.username,
            'Default holdings',
          );

          // Step 9: Click on the row with data export job at the "Data Export" logs table
          DataExportLogs.clickFileNameFromTheList(failedFileName);

          // Step 10-13: Verify error messages in error logs
          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          instances[0].holdingsCollege.forEach((holding) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              new RegExp(
                `${formattedDateUpToHours}.*ERROR ${holding.id} - the user ${user.username} is not affiliated with ${Affiliations.College} data tenant and holdings records from this tenant were omitted during export\\.`,
              ),
            );
          });

          instances[0].holdingsUniversity.forEach((holding) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              new RegExp(
                `${formattedDateUpToHours}.*ERROR ${holding.id} - the user ${user.username} does not have permissions to access the holdings record in ${Affiliations.University} data tenant\\.`,
              ),
            );
          });

          instances[1].holdingsCollege.forEach((holding) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              new RegExp(
                `${formattedDateUpToHours}.*ERROR ${holding.id} - the user ${user.username} is not affiliated with ${Affiliations.College} data tenant and holdings records from this tenant were omitted during export\\.`,
              ),
            );
          });

          instances[1].holdingsUniversity.forEach((holding) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              new RegExp(
                `${formattedDateUpToHours}.*ERROR ${holding.id} - the user ${user.username} does not have permissions to access the holdings record in ${Affiliations.University} data tenant\\.`,
              ),
            );
          });

          const allHoldingIds = [
            ...instances[0].holdingsCollege.map((h) => h.id),
            ...instances[0].holdingsUniversity.map((h) => h.id),
            ...instances[1].holdingsCollege.map((h) => h.id),
            ...instances[1].holdingsUniversity.map((h) => h.id),
            // TODO: Uncomment when MDEXP-776 is done
            // ...instances[2].holdingsCollege.map((h) => h.id),
            // ...instances[3].holdingsCollege.map((h) => h.id),
          ];

          allHoldingIds.forEach((holdingId) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              new RegExp(`${formattedDateUpToHours}.*ERROR UUID ${holdingId} repeated 2 times.`),
            );
          });

          // TODO: Uncomment when MDEXP-776 is done
          // const localHoldingIds = [
          //   ...instances[2].holdingsCollege.map((h) => h.id),
          //   ...instances[3].holdingsCollege.map((h) => h.id),
          // ];

          // const regexParts = localHoldingIds.map((uuid) => `(?=.*${uuid})`);
          // const regexPattern = `${formattedDateUpToHours}.*ERROR Record not found: ${regexParts.join('')}`;
          // const regex = new RegExp(regexPattern);

          // DataExportLogs.verifyErrorTextInErrorLogsPane(regex);
        });
      },
    );
  });
});
