import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

let user;
let loanTypeId;
let materialTypeId;
let holdingTypeId;
let locationId;
let instanceJobHrid;
const instance = {
  instanceTitle: `AT_C446175_FolioInstance_${getRandomPostfix()}`,
};
const itemBarcodes = {
  item1: generateItemBarcode(),
  item2: generateItemBarcode(),
  item3: generateItemBarcode(),
};
const duplicateFormerId = `xyz${getRandomPostfix()}`;
const uniqueFormerId = `abc${getRandomPostfix()}`;
const mixedFormerIdsFileName = `mixedItemFormerIds_${getRandomPostfix()}.csv`;
const duplicatesOnlyFileName = `duplicateItemFormerIds_${getRandomPostfix()}.csv`;
const mixedFileNames = BulkEditFiles.getAllDownloadedFileNames(mixedFormerIdsFileName, true);
const duplicatesFileNames = BulkEditFiles.getAllDownloadedFileNames(duplicatesOnlyFileName, true);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditLogsView.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((locations) => {
          locationId = locations.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          loanTypeId = loanTypes[0].id;
        });
        cy.getDefaultMaterialType().then((materialType) => {
          materialTypeId = materialType.id;
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          // Create single FOLIO instance with 3 items
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypeData[0].id,
              title: instance.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: holdingTypeId,
                permanentLocationId: locationId,
              },
            ],
            items: [
              {
                barcode: itemBarcodes.item1,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: loanTypeId },
                materialType: { id: materialTypeId },
                formerIds: [duplicateFormerId],
              },
              {
                barcode: itemBarcodes.item2,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: loanTypeId },
                materialType: { id: materialTypeId },
                formerIds: [duplicateFormerId],
              },
              {
                barcode: itemBarcodes.item3,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: loanTypeId },
                materialType: { id: materialTypeId },
                formerIds: [uniqueFormerId],
              },
            ],
          }).then((specialInstanceIds) => {
            instance.id = specialInstanceIds.instanceId;
          });

          // Create CSV file with mixed identifiers (duplicates + unique)
          FileManager.createFile(
            `cypress/fixtures/${mixedFormerIdsFileName}`,
            `${duplicateFormerId}\n${uniqueFormerId}`,
          );

          // Create CSV file with only duplicate identifiers
          FileManager.createFile(
            `cypress/fixtures/${duplicatesOnlyFileName}`,
            `${duplicateFormerId}`,
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcodes.item1);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${mixedFormerIdsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${duplicatesOnlyFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(mixedFileNames);
      BulkEditFiles.deleteAllDownloadedFiles(duplicatesFileNames);
    });

    it(
      'C446175 Verify handling duplicates in matched records - Items (Logs) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C446175'] },
      () => {
        // Step 1: Select "Inventory - items" radio button and "Item former identifier" from dropdown
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item former identifiers');

        // Step 2: Upload CSV file with mixed Item Former identifiers (duplicates + unique)
        BulkEditSearchPane.uploadFile(mixedFormerIdsFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the CSV file
        BulkEditSearchPane.verifyMatchedResults(itemBarcodes.item3);
        BulkEditSearchPane.verifyPaneRecordsCount('1 item');

        // Step 4: Check "Preview of record matched" includes only unique identifier
        BulkEditSearchPane.verifyMatchedResults(itemBarcodes.item3);
        BulkEditSearchPane.verifyCellWithContentAbsentsInMatchedAccordion(
          itemBarcodes.item1,
          itemBarcodes.item2,
        );

        // Step 5: Check "Errors & warnings" accordion for duplicate identifiers
        BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
        BulkEditSearchPane.verifyErrorLabel(1, 0);
        BulkEditSearchPane.verifyErrorByIdentifier(
          duplicateFormerId,
          ERROR_MESSAGES.MULTIPLE_MATCHES_FOR_IDENTIFIER,
        );
        BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

        // Step 6: Go to "Logs" tab and check "Inventory - items" checkbox
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkItemsCheckbox();

        // Step 7: Click on "..." action element and download "File with the matching records"
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyCSVFileRowsRecordsNumber(mixedFileNames.matchedRecordsCSV, 1);
        ExportFile.verifyFileIncludes(mixedFileNames.matchedRecordsCSV, [uniqueFormerId]);

        // Step 8-9: Download "File with errors encountered during the record matching"
        BulkEditLogs.clickActionsRunBy(user.username);
        BulkEditLogs.downloadFileWithErrorsEncountered();
        ExportFile.verifyFileIncludes(mixedFileNames.errorsFromMatching, [
          `ERROR,${duplicateFormerId},${ERROR_MESSAGES.MULTIPLE_MATCHES_FOR_IDENTIFIER}`,
        ]);

        // Clean up downloaded files
        FileManager.deleteFileFromDownloadsByMask(mixedFileNames.matchedRecordsCSV);
        FileManager.deleteFileFromDownloadsByMask(mixedFileNames.errorsFromMatching);

        // Step 10: Go to "Identifiers" tab and select "Item former identifier" from dropdown
        BulkEditSearchPane.openIdentifierSearch();
        BulkEditSearchPane.checkItemsRadio();
        cy.intercept('POST', '/bulk-operations/*/start').as('instanceBulkOperations');
        BulkEditSearchPane.selectRecordIdentifier('Item former identifiers');

        // Step 11: Upload CSV file with only duplicate Item Former identifiers
        BulkEditSearchPane.uploadFile(duplicatesOnlyFileName);
        BulkEditSearchPane.waitFileUploading();
        cy.wait('@instanceBulkOperations').then(({ response }) => {
          instanceJobHrid = String(response.body.hrId);

          // Step 12: Check the result of uploading - 0 records matched
          BulkEditSearchPane.verifyPaneRecordsCount('0 item');
          BulkEditSearchPane.matchedAccordionIsAbsent();
          BulkEditSearchPane.verifyPaginatorInErrorsAccordion(1);

          // Step 13: Check "Errors & warnings" accordion includes duplicate identifier error
          BulkEditSearchPane.verifyErrorLabel(1, 0);
          BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
          BulkEditSearchPane.verifyErrorByIdentifier(
            duplicateFormerId,
            ERROR_MESSAGES.MULTIPLE_MATCHES_FOR_IDENTIFIER,
          );

          // Step 14: Go to "Logs" tab and check "Inventory - items" checkbox
          BulkEditSearchPane.openLogsSearch();

          // Step 15: Download "File with errors encountered during the record matching"
          BulkEditLogs.clickActionsByJobHrid(instanceJobHrid);
          BulkEditLogs.downloadFileWithErrorsEncountered();

          // Step 16: Open downloaded CSV file and verify it contains three columns
          ExportFile.verifyFileIncludes(duplicatesFileNames.errorsFromMatching, [
            `ERROR,${duplicateFormerId},${ERROR_MESSAGES.MULTIPLE_MATCHES_FOR_IDENTIFIER}`,
          ]);
        });
      },
    );
  });
});
