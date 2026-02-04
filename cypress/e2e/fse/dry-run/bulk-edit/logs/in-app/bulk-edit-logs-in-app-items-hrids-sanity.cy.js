import TopMenu from '../../../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import FileManager from '../../../../../../support/utils/fileManager';
import BulkEditActions from '../../../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import { ITEM_STATUS_NAMES } from '../../../../../../support/constants';
import BulkEditLogs from '../../../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../../../support/fragments/data-export/exportFile';
import { parseSanityParameters } from '../../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();
let itemHRIDsFileName;
let fileNames;
let invalidItemHRID;
let itemJobHrid;
const instance = {
  title: `AT_C375281_FolioInstance_${getRandomPostfix()}`,
};
const item1 = {
  barcode: getRandomPostfix(),
};
const item2 = {
  barcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        itemHRIDsFileName = `validItemHRIDs_${getRandomPostfix()}.csv`;
        fileNames = BulkEditFiles.getAllDownloadedFileNames(itemHRIDsFileName, true);
        invalidItemHRID = getRandomPostfix();

        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password)
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              instance.instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              instance.holdingTypeId = res[0].id;
            });
            cy.getLocations({ limit: 1 }).then((res) => {
              instance.locationId = res.id;
            });
            cy.getLoanTypes({ limit: 1 }).then((res) => {
              instance.loanTypeId = res[0].id;
            });
            cy.getDefaultMaterialType().then((res) => {
              instance.materialTypeId = res.id;
            });
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instance.instanceTypeId,
                title: instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: instance.holdingTypeId,
                  permanentLocationId: instance.locationId,
                },
              ],
              items: [
                {
                  barcode: item1.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: instance.loanTypeId },
                  materialType: { id: instance.materialTypeId },
                },
                {
                  barcode: item2.barcode,
                  status: { name: 'Missing' },
                  permanentLoanType: { id: instance.loanTypeId },
                  materialType: { id: instance.materialTypeId },
                },
              ],
            }).then((specialInstanceIds) => {
              instance.id = specialInstanceIds.instanceId;
            });
          })
          .then(() => {
            cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item1.barcode}"` }).then(
              (res) => {
                item1.hrid = res.hrid;
                item1.id = res.id;
              },
            );
            cy.getItems({ limit: 1, expandAll: true, query: `"barcode"=="${item2.barcode}"` }).then(
              (res) => {
                item2.hrid = res.hrid;
                item2.id = res.id;
                FileManager.createFile(
                  `cypress/fixtures/${itemHRIDsFileName}`,
                  `${item1.hrid}\n${item2.hrid}\n${invalidItemHRID}`,
                );
              },
            );
          });

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        cy.allure().logCommandSteps(true);
      });

      after('delete test data', () => {
        cy.getUserToken(user.username, user.password);
        cy.setTenant(memberTenant.id);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item1.barcode);
        FileManager.deleteFile(`cypress/fixtures/${itemHRIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(itemHRIDsFileName);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C375281 Verify generated Logs files for Items In app -- valid and invalid records (firebird)',
        { tags: ['dryRun', 'firebird', 'C375281'] },
        () => {
          BulkEditSearchPane.checkItemsRadio();
          cy.intercept('POST', '/bulk-operations/*/start').as('itemBulkOperations');
          BulkEditSearchPane.selectRecordIdentifier('Item HRIDs');

          BulkEditSearchPane.uploadFile(itemHRIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          cy.wait('@itemBulkOperations').then(({ response }) => {
            itemJobHrid = String(response.body.hrId);

            BulkEditActions.downloadMatchedResults();
            BulkEditActions.downloadErrors();

            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.clearPermanentLocation('item', 0);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.replaceItemStatus('Missing', 1);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.clearTemporaryLoanType(2);
            BulkEditActions.confirmChanges();
            BulkEditActions.downloadPreview();
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();
            BulkEditActions.downloadErrors();

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.checkItemsCheckbox();
            BulkEditLogs.clickActionsByJobHrid(itemJobHrid);
            BulkEditLogs.verifyLogsRowActionWhenCompletedWithErrors();

            BulkEditLogs.downloadFileUsedToTrigger();
            BulkEditFiles.verifyCSVFileRows(itemHRIDsFileName, [
              item1.hrid,
              item2.hrid,
              invalidItemHRID,
            ]);

            BulkEditLogs.downloadFileWithMatchingRecords();
            ExportFile.verifyFileIncludes(`*${fileNames.matchedRecordsCSV}`, [
              item1.hrid,
              item2.hrid,
            ]);

            BulkEditLogs.downloadFileWithErrorsEncountered();
            BulkEditFiles.verifyMatchedResultFileContent(
              fileNames.errorsFromMatching,
              ['\uFEFFERROR', invalidItemHRID],
              'firstElement',
              false,
            );

            BulkEditLogs.downloadFileWithProposedChanges();
            ExportFile.verifyFileIncludes(fileNames.previewRecordsCSV, [item1.id, item2.id]);

            BulkEditLogs.downloadFileWithUpdatedRecords();
            ExportFile.verifyFileIncludes(fileNames.changedRecordsCSV, [item1.id]);

            BulkEditLogs.downloadFileWithCommitErrors();
            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [item2.hrid]);

            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.searchByParameter('Barcode', item1.barcode);
            ItemRecordView.waitLoading();
            ItemRecordView.closeDetailView();
            InventoryInstance.openHoldings(['']);
            InventoryInstance.verifyCellsContent('Missing');
          });
        },
      );
    });
  });
});
