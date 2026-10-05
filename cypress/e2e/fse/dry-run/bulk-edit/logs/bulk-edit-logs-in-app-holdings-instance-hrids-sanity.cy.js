import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../../support/fragments/topMenu';
import FileManager from '../../../../../support/utils/fileManager';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BulkEditActions from '../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import BulkEditLogs from '../../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
const instance = {
  barcode: `456-${getRandomPostfix()}`,
  instanceName: `AT_C375298_FolioInstance_${getRandomPostfix()}`,
};
const instance2 = {
  barcode: `789-${getRandomPostfix()}`,
  instanceName: `AT_C375298_FolioInstance2_${getRandomPostfix()}`,
};
let invalidInstanceHRID;
let validAndInvalidInstanceHRIDsFileName;
let holdingJobHrid;
let fileNames;
let instanceTypeId;
let holdingsTypeId;
let loanTypeId;
let materialTypeId;
let locationId1;
let locationId2;
let locationId3;
let locationName1;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        invalidInstanceHRID = `123-${getRandomPostfix()}`;
        validAndInvalidInstanceHRIDsFileName = `validAndInvalidInstanceHRIDS-${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(validAndInvalidInstanceHRIDsFileName);

        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false })
          .then(() => {
            // Fetch required type IDs
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              holdingsTypeId = res[0].id;
            });
            // Fetch three different locations
            InventoryInstances.getLocations({ limit: 3 }).then((locations) => {
              locationId1 = locations[0].id;
              locationName1 = locations[0].name;
              locationId2 = locations[1].id;
              locationId3 = locations[2].id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              materialTypeId = res.id;
            });
          })
          .then(() => {
            // Create first instance
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance.instanceName,
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId: locationId1,
                },
              ],
              items: [
                {
                  barcode: instance.barcode,
                  status: { name: 'Available' },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                },
              ],
            }).then((specialInstanceIds) => {
              instance.id = specialInstanceIds.instanceId;
              instance.holdingUUID = specialInstanceIds.holdingIds[0].id;
            });

            // Create second instance
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance2.instanceName,
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId: locationId2,
                  temporaryLocationId: locationId3,
                },
              ],
              items: [
                {
                  barcode: instance2.barcode,
                  status: { name: 'Available' },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                },
              ],
            }).then((specialInstanceIds) => {
              instance2.id = specialInstanceIds.instanceId;
              instance2.holdingUUID = specialInstanceIds.holdingIds[0].id;
            });
          })
          .then(() => {
            cy.getInstanceById(instance.id).then((res) => {
              instance.hrid = res.hrid;
            });
            cy.getInstanceById(instance2.id)
              .then((res) => {
                instance2.hrid = res.hrid;
              })
              .then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${validAndInvalidInstanceHRIDsFileName}`,
                  `${instance.hrid}\n${instance2.hrid}\n${invalidInstanceHRID}`,
                );
              });
          });

        cy.wait(5000);
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        cy.allure().logCommandSteps(true);
      });

      after('delete test data', () => {
        cy.getUserToken(user.username, user.password, { log: false });
        cy.setTenant(memberTenant.id);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.barcode);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance2.barcode);
        FileManager.deleteFile(`cypress/fixtures/${validAndInvalidInstanceHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(validAndInvalidInstanceHRIDsFileName);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C375298 Verify generated Logs files for Holdings In app -- valid and invalid records (firebird)',
        { tags: ['dryRun', 'firebird', 'C375298'] },
        () => {
          BulkEditSearchPane.checkHoldingsRadio();
          cy.intercept('POST', '/bulk-operations/*/start').as('holdingBulkOperations');
          BulkEditSearchPane.selectRecordIdentifier('Instance HRIDs');

          BulkEditSearchPane.uploadFile(validAndInvalidInstanceHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          cy.wait('@holdingBulkOperations').then(({ response }) => {
            holdingJobHrid = String(response.body.hrId);

            BulkEditActions.downloadMatchedResults();
            BulkEditActions.downloadErrors();
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.clearTemporaryLocation('holdings', 0);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.replacePermanentLocation(locationName1, 'holdings', 1);

            BulkEditActions.confirmChanges();
            BulkEditActions.downloadPreview();
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditActions.downloadErrors();

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkHoldingsCheckbox();
            BulkEditLogs.clickActionsByJobHrid(holdingJobHrid);
            BulkEditLogs.verifyLogsRowActionWhenCompletedWithErrors();

            BulkEditLogs.downloadFileUsedToTrigger();
            ExportFile.verifyFileIncludes(validAndInvalidInstanceHRIDsFileName, [
              instance.hrid,
              instance2.hrid,
              invalidInstanceHRID,
            ]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            ExportFile.verifyFileIncludes(fileNames.matchedRecordsCSV, [
              instance.holdingUUID,
              instance2.holdingUUID,
            ]);

            BulkEditLogs.downloadFileWithErrorsEncountered();
            ExportFile.verifyFileIncludes(fileNames.errorsFromMatching, [invalidInstanceHRID]);

            BulkEditLogs.downloadFileWithProposedChanges();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.previewRecordsCSV,
              ['', ''],
              'temporaryLocation',
              true,
            );
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.previewRecordsCSV,
              [locationName1, locationName1],
              'permanentLocation',
              true,
            );

            BulkEditLogs.downloadFileWithUpdatedRecords();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.changedRecordsCSV,
              ['', ''],
              'temporaryLocation',
              true,
            );
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.changedRecordsCSV,
              [locationName1],
              'permanentLocation',
              true,
            );

            BulkEditLogs.downloadFileWithCommitErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [instance.hrid]);

            // Go to inventory app and verify changes
            [instance, instance2].forEach((inst) => {
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.waitContentLoading();
              InventorySearchAndFilter.searchByParameter('Instance HRID', inst.hrid);
              InventorySearchAndFilter.selectSearchResultItem();
              InventorySearchAndFilter.selectViewHoldings();
              InventoryInstance.verifyHoldingsPermanentLocation(locationName1);
              InventoryInstance.verifyHoldingsTemporaryLocation('-');
              InventoryInstance.closeHoldingsView();
            });
          });
        },
      );
    });
  });
});
