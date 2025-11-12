/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
let location;
let exportedFileName;
let secondExportedFileName;
let firstJobHrid;
let holdingId;
let holdingHrid;
const fileName = `AT_C446037_HoldingsUUIDs_${getRandomPostfix()}.csv`;
const instanceOne = { title: `AT_C446037_MarcInstance_${getRandomPostfix()}` };
const recordsCount = 1;

describe('Data Export', () => {
  describe('Holdings records export', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getLocations({ limit: 1 }).then((res) => {
          location = res;
        });

        cy.createSimpleMarcBibViaAPI(instanceOne.title)
          .then((marcInstanceId) => {
            instanceOne.id = marcInstanceId;

            cy.getInstanceById(marcInstanceId).then((instanceData) => {
              instanceOne.hrid = instanceData.hrid;

              cy.createSimpleMarcHoldingsViaAPI(
                instanceOne.id,
                instanceOne.hrid,
                location.code,
              ).then((marcHoldingId) => {
                holdingId = marcHoldingId;

                cy.getHoldings({
                  limit: 1,
                  query: `"id"="${marcHoldingId}"`,
                }).then((marcHoldings) => {
                  holdingHrid = marcHoldings[0].hrid;
                });
              });
            });
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${fileName}`, holdingId);
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
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
      FileManager.deleteFileFromDownloadsByMask(secondExportedFileName);
    });

    it(
      'C446037 Verify export MARC Holdings with edited SRS (firebird)',
      { tags: ['extendedPath', 'firebird', 'C446037'] },
      () => {
        // Step 1: Trigger the data export by submitting .csv file with Holdings UUID
        ExportFile.uploadFile(fileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run Default holdings export job profile
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');
        DataExportLogs.verifyAreYouSureModalAbsent();

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          firstJobHrid = jobData.hrId;
          exportedFileName = `${fileName.replace('.csv', '')}-${firstJobHrid}.mrc`;

          // Step 3: Verify export result and download the file
          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            recordsCount,
            firstJobHrid,
            user.username,
            'Default holdings',
          );
          cy.getUserToken(user.username, user.password);
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Step 4: Verify exported records match Inventory
          const assertionsOnInitialMarcFileContent = [
            {
              uuid: holdingId,
              assertions: [
                (record) => {
                  expect(record.leader).to.exist;
                },
                (record) => {
                  expect(record.fields[0]).to.deep.eq(['001', holdingHrid]);
                },
                (record) => {
                  const field004 = record.fields.find((f) => f[0] === '004');

                  expect(field004).to.deep.eq(['004', instanceOne.hrid]);
                },
                (record) => {
                  const field583 = record.fields.find((f) => f[0] === '583');

                  expect(field583).to.deep.eq(['583', '  ', 'a', 'note']);
                },
                (record) => {
                  const field852 = record.fields.find((f) => f[0] === '852');

                  expect(field852).to.deep.eq(['852', '  ', 'b', location.code]);
                },
                (record) => {
                  const field999 = record.get('999')[0];

                  expect(field999.subf[1][0]).to.eq('i');
                  expect(field999.subf[1][1]).to.eq(holdingId);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnInitialMarcFileContent,
            recordsCount,
          );
        });

        // Step 5: Go to "Inventory" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();

        // Step 6: Find MARC Holdings from Preconditions
        InventorySearchAndFilter.searchInstanceByTitle(instanceOne.id);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 7: Click "View holdings" button
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 8: Click Actions menu => click "Edit in quickMARC"
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        // Step 9: Edit 583 field
        QuickMarcEditor.updateExistingField('583', '$a updated note value');

        // Step 10: Click the "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveHoldings();

        // Step 11: Close Holdings window and return to Data Export
        HoldingsRecordView.checkHoldingRecordViewOpened();
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);

        // Step 12: Trigger the data export again by submitting the same .csv file
        ExportFile.uploadFile(fileName);
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');
        DataExportLogs.verifyAreYouSureModalAbsent();

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo2');
        cy.wait('@getInfo2', getLongDelay()).then(({ response }) => {
          const jobs = response.body.jobExecutions;
          const jobData = jobs.find(
            (job) => job.runBy.userId === user.userId && job.hrId !== firstJobHrid,
          );
          const jobId = jobData.hrId;
          secondExportedFileName = `${fileName.replace('.csv', '')}-${jobId}.mrc`;

          // Step 13: Verify export result and download the file
          DataExportResults.verifySuccessExportResultCells(
            secondExportedFileName,
            recordsCount,
            jobId,
            user.username,
            'Default holdings',
          );
          DataExportLogs.clickButtonWithText(secondExportedFileName);

          // Step 14: Verify updated exported records match edited Inventory
          const assertionsOnUpdatedMarcFileContent = [
            {
              uuid: holdingId,
              assertions: [
                (record) => {
                  expect(record.leader).to.exist;
                },
                (record) => {
                  expect(record.fields[0]).to.deep.eq(['001', holdingHrid]);
                },
                (record) => {
                  const field004 = record.fields.find((f) => f[0] === '004');

                  expect(field004).to.deep.eq(['004', instanceOne.hrid]);
                },
                (record) => {
                  const field583 = record.fields.find((f) => f[0] === '583');

                  expect(field583).to.deep.eq(['583', '  ', 'a', 'updated note value']);
                },
                (record) => {
                  const field852 = record.fields.find((f) => f[0] === '852');

                  expect(field852).to.deep.eq(['852', '  ', 'b', location.code]);
                },
                (record) => {
                  const field999 = record.get('999')[0];

                  expect(field999.subf[1][0]).to.eq('i');
                  expect(field999.subf[1][1]).to.eq(holdingId);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(
            secondExportedFileName,
            assertionsOnUpdatedMarcFileContent,
            recordsCount,
          );
        });
      },
    );
  });
});
