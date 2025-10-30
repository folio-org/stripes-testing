import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { getLongDelay } from '../../../support/utils/cypressTools';

let user;
let location;
let holdingTypeId;
let sourceId;
let exportedFileName;
const holdingsIds = [];
const holdingsHrids = [];
const fileName = `AT_C350445_TestFile_${getRandomPostfix()}.csv`;
const instanceOne = { title: `AT_C350445_FolioInstance_${getRandomPostfix()}` };
const instanceTwo = { title: `AT_C350445_FolioInstance2_${getRandomPostfix()}` };
const recordsCount = 3;

describe('Data Export', () => {
  describe('Holdings records export', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getLocations({ limit: 1 }).then((res) => {
          location = res;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          sourceId = folioSource.id;
        });
        cy.getHoldingTypes({ limit: 1 })
          .then((res) => {
            holdingTypeId = res[0].id;
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(instanceOne.title).then((marcInstanceId) => {
              instanceOne.id = marcInstanceId;

              cy.getInstanceById(marcInstanceId).then((instanceData) => {
                instanceOne.hrid = instanceData.hrid;

                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceOne.id,
                  permanentLocationId: location.id,
                  holdingsTypeId: holdingTypeId,
                  sourceId,
                }).then((folioHolding) => {
                  cy.getHoldings({
                    limit: 1,
                    query: `"id"="${folioHolding.id}"`,
                  }).then((holdings) => {
                    holdingsIds.push(folioHolding.id);
                    holdingsHrids.push(holdings[0].hrid);

                    cy.createSimpleMarcHoldingsViaAPI(
                      instanceOne.id,
                      instanceOne.hrid,
                      location.code,
                    ).then((marcHoldingId) => {
                      cy.getHoldings({
                        limit: 1,
                        query: `"id"="${marcHoldingId}"`,
                      }).then((marcHoldings) => {
                        holdingsIds.push(marcHoldingId);
                        holdingsHrids.push(marcHoldings[0].hrid);
                      });
                    });
                  });
                });
              });
            });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(instanceTwo.title).then((marcInstanceId) => {
              instanceTwo.id = marcInstanceId;

              cy.getInstanceById(marcInstanceId).then((instanceData) => {
                instanceTwo.hrid = instanceData.hrid;

                cy.createSimpleMarcHoldingsViaAPI(
                  instanceTwo.id,
                  instanceTwo.hrid,
                  location.code,
                ).then((marcHoldingId) => {
                  cy.getHoldings({
                    limit: 1,
                    query: `"id"="${marcHoldingId}"`,
                  }).then((marcHoldings) => {
                    holdingsIds.push(marcHoldingId);
                    holdingsHrids.push(marcHoldings[0].hrid);
                  });
                });
              });
            });
          })
          .then(() => {
            const allHoldingIds = [...holdingsIds].join('\n');

            FileManager.createFile(`cypress/fixtures/${fileName}`, allHoldingIds);
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceOne.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceTwo.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C350445 Verify Holdings export based on provided UUIDs (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350445'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with Holdings UUIDs
        ExportFile.uploadFile(fileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run Default holdings export job profile (Specify holdings UUID type on modal handled internally by helper)
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            jobId,
            user.username,
            'Default holdings',
          );

          // Step 3: Download file (click hyperlink in Logs table)
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 4 - 5: Parse and verify exported MARC holdings records
          const createMarcHoldingAssertions = (holdingHrid, instanceHrid, holdingId) => [
            (record) => expect(record.leader).to.exist,
            (record) => expect(record.get('001')[0].value).to.eq(holdingHrid),
            (record) => expect(record.get('004')[0].value).to.eq(instanceHrid),
            (record) => expect(record.get('005')[0].value).to.match(/^[0-9]{14}\.[0-9]{1}$/),
            (record) => expect(record.get('008')).to.not.be.empty,
            (record) => {
              const field583 = record.get('583')[0];

              expect(field583.subf[0][0]).to.eq('a');
              expect(field583.subf[0][1]).to.eq('note');
            },
            (record) => expect(record.get('852')).to.not.be.empty,
            (record) => {
              const field999 = record.get('999')[0];

              expect(field999.subf[1][0]).to.eq('i');
              expect(field999.subf[1][1]).to.eq(holdingId);
            },
          ];

          const recordsToVerify = [
            {
              uuid: holdingsIds[0], // FOLIO holding
              assertions: [
                (record) => expect(record.leader).to.exist,
                (record) => expect(record.get('001')[0].value).to.eq(holdingsHrids[0]),
                (record) => expect(record.get('004')[0].value).to.eq(instanceOne.hrid),
                (record) => {
                  const field852 = record.get('852')[0];
                  expect(field852.subf[0][0]).to.eq('b');
                  expect(field852.subf[0][1]).to.eq(location.name);
                },
                (record) => {
                  const field999 = record.get('999')[0];

                  expect(field999.subf[0][0]).to.eq('i');
                  expect(field999.subf[0][1]).to.eq(holdingsIds[0]);
                },
              ],
            },
            {
              uuid: holdingsIds[1], // MARC holding (same instance)
              assertions: createMarcHoldingAssertions(
                holdingsHrids[1],
                instanceOne.hrid,
                holdingsIds[1],
              ),
            },
            {
              uuid: holdingsIds[2], // MARC holding (different instance)
              assertions: createMarcHoldingAssertions(
                holdingsHrids[2],
                instanceTwo.hrid,
                holdingsIds[2],
              ),
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, recordsToVerify, recordsCount, false);
        });
      },
    );
  });
});
