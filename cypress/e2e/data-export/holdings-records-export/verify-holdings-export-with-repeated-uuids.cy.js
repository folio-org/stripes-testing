import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let location;
let holdingTypeId;
let sourceId;
const holdingsIds = [];
const randomPostfix = getRandomPostfix();
const fileName = `AT_C423591_HoldingsUUIDs_${randomPostfix}.csv`;
const instanceOne = { title: `AT_C423591_MarcInstance_${randomPostfix}` };
const instanceTwo = { title: `AT_C423591_FolioInstance_${randomPostfix}` };

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
            // Create MARC instance with 1 holding
            cy.createSimpleMarcBibViaAPI(instanceOne.title).then((instanceId) => {
              instanceOne.id = instanceId;

              cy.getInstanceById(instanceId).then((instanceData) => {
                instanceOne.hrid = instanceData.hrid;

                cy.createSimpleMarcHoldingsViaAPI(
                  instanceOne.id,
                  instanceOne.hrid,
                  location.code,
                ).then((marcHoldingId) => {
                  holdingsIds.push(marcHoldingId);
                });
              });
            });
          })
          .then(() => {
            // Create FOLIO instance with 1 holding
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: instanceTwo.title,
                },
              }).then((createdInstanceData) => {
                instanceTwo.id = createdInstanceData.instanceId;

                cy.getInstanceById(createdInstanceData.instanceId).then((instanceData) => {
                  instanceTwo.hrid = instanceData.hrid;

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceTwo.id,
                    sourceId,
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: location.id,
                  }).then((holding) => {
                    holdingsIds.push(holding.id);
                  });
                });
              });
            });
          })
          .then(() => {
            const csvContent = `${holdingsIds[0]}\n${holdingsIds[0]}\n${holdingsIds[1]}`;

            FileManager.createFile(`cypress/fixtures/${fileName}`, csvContent);
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceOne.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceTwo.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    });

    it(
      'C423591 Verify Holdings export using Holdings UUIDs repeated several times (firebird)',
      { tags: ['extendedPath', 'firebird', 'C423591'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with Holdings UUIDs
        ExportFile.uploadFile(fileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run the Default holdings job profile > Specify "holdings" type > Click on "Run" button
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = 3;
          const exportedRecordsCount = 2;
          const resultFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            resultFileName,
            totalRecordsCount,
            exportedRecordsCount,
            jobId,
            user,
            'Default holdings',
          );

          // Step 3: Click on the row with recently completed with errors job to view error details
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(`${formattedDateUpToHours}.*ERROR UUID ${holdingsIds[0]} repeated 2 times`),
          );
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(`${formattedDateUpToHours}.*ERROR Failed records number: 1`),
          );
        });
      },
    );
  });
});
