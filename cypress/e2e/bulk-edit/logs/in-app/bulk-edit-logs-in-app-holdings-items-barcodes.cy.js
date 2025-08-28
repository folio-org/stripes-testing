import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { LOCATION_IDS, LOCATION_NAMES, APPLICATION_NAMES } from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${itemBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-CSV-${itemBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${itemBarcodesFileName}`;

const instance = {
  barcode: `456-${getRandomPostfix()}`,
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
};
const instance2 = {
  barcode: `789-${getRandomPostfix()}`,
  instanceName: `testBulkEdit2_${getRandomPostfix()}`,
};

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('In-app approach', () => {
      before('create test data', () => {
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.getAdminToken().then(() => {
            instance.id = InventoryInstances.createInstanceViaApi(
              instance.instanceName,
              instance.barcode,
            );
            instance2.id = InventoryInstances.createInstanceViaApi(
              instance2.instanceName,
              instance2.barcode,
            );
            cy.getHoldings({ limit: 1, query: `"instanceId"="${instance.id}"` }).then(
              (holdings) => {
                instance.holdingUUID = holdings[0].id;
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  temporaryLocationId: LOCATION_IDS.MAIN_LIBRARY,
                  permanentLocationId: LOCATION_IDS.ONLINE,
                });
              },
            );
            cy.getHoldings({ limit: 1, query: `"instanceId"="${instance2.id}"` })
              .then((holdings) => {
                instance2.holdingUUID = holdings[0].id;
                cy.updateHoldingRecord(holdings[0].id, {
                  ...holdings[0],
                  temporaryLocationId: LOCATION_IDS.MAIN_LIBRARY,
                  permanentLocationId: LOCATION_IDS.ONLINE,
                });
              })
              .then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${itemBarcodesFileName}`,
                  `${instance.barcode}\n${instance2.barcode}`,
                );
              });
          });
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.barcode);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance2.barcode);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          itemBarcodesFileName,
          `*${matchedRecordsFileName}`,
          previewOfProposedChangesFileName,
          updatedRecordsFileName,
        );
      });

      it(
        'C375300 Verify generated Logs files for Holdings In app -- only valid Item barcodes (firebird)',
        { tags: ['smoke', 'firebird', 'C375300'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Item barcodes');
          BulkEditSearchPane.uploadFile(itemBarcodesFileName);
          BulkEditSearchPane.waitFileUploading();

          BulkEditActions.downloadMatchedResults();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            'Instance (Title, Publisher, Publication date)',
          );
          BulkEditSearchPane.verifyResultColumnTitles(
            'Instance (Title, Publisher, Publication date)',
          );

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.replaceTemporaryLocation(LOCATION_NAMES.MAIN_LIBRARY, 'holdings', 0);
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.replacePermanentLocation(
            LOCATION_NAMES.POPULAR_READING_COLLECTION,
            'holdings',
            1,
          );

          BulkEditActions.confirmChanges();
          BulkEditActions.downloadPreview();
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkHoldingsCheckbox();
          BulkEditLogs.clickActionsRunBy(user.username);
          BulkEditLogs.verifyLogsRowActionWhenCompleted();

          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(itemBarcodesFileName, [
            instance.barcode,
            instance2.barcode,
          ]);

          ExportFile.verifyFileIncludes(`*${matchedRecordsFileName}`, [
            instance.holdingUUID,
            instance2.holdingUUID,
          ]);

          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName,
            [LOCATION_NAMES.MAIN_LIBRARY_UI, LOCATION_NAMES.MAIN_LIBRARY_UI],
            'temporaryLocation',
            true,
          );
          BulkEditFiles.verifyMatchedResultFileContent(
            previewOfProposedChangesFileName,
            [
              LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
              LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
            ],
            'permanentLocation',
            true,
          );

          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            [LOCATION_NAMES.MAIN_LIBRARY_UI, LOCATION_NAMES.MAIN_LIBRARY_UI],
            'temporaryLocation',
            true,
          );
          BulkEditFiles.verifyMatchedResultFileContent(
            updatedRecordsFileName,
            [
              LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
              LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
            ],
            'permanentLocation',
            true,
          );

          // Go to inventory app and verify changes
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', instance.barcode);
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.selectSearchResultItem();
          InventorySearchAndFilter.selectViewHoldings();
          InventoryInstance.verifyHoldingsPermanentLocation(
            LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
          );
          InventoryInstance.verifyHoldingsTemporaryLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
          InventoryInstance.closeHoldingsView();

          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchByParameter('Barcode', instance2.barcode);
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.selectSearchResultItem();
          InventorySearchAndFilter.selectViewHoldings();
          InventoryInstance.verifyHoldingsPermanentLocation(
            LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
          );
          InventoryInstance.verifyHoldingsTemporaryLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
        },
      );
    });
  });
});
