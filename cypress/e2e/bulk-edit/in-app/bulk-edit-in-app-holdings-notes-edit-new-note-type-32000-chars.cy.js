import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../support/constants';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

let user;
let noteTypeId;
const specialNoteTypeName = `n@te type ~,#,$,%,^,&, {.[,]<},>,ø, Æ, §,;_${getRandomPostfix()}`;
const notes = { administrative: 'a'.repeat(31999), customNoteType: 'b'.repeat(31999) };
const instanceA = {
  instanceName: `AT_C422061 instanceA-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const instanceB = {
  instanceName: `C422061 instanceB-${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemBarcodesFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(itemBarcodesFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemBarcodesFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.getAdminToken();

      InventoryInstances.createHoldingsNoteTypeViaApi(specialNoteTypeName).then((id) => {
        noteTypeId = id;
      });
      cy.wait(3000);

      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.inventoryCRUDHoldings.gui,
        permissions.inventoryCRUDHoldingsNoteTypes.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create instance A with custom note type
        instanceA.instanceId = InventoryInstances.createInstanceViaApi(
          instanceA.instanceName,
          instanceA.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceA.instanceId}"`,
        }).then((holdings) => {
          instanceA.holdingHRID = holdings[0].hrid;
          instanceA.holdingsUUID = holdings[0].id;

          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            notes: [
              {
                holdingsNoteTypeId: noteTypeId,
                note: notes.customNoteType,
                staffOnly: false,
              },
            ],
          });
        });

        // Create instance B with administrative note
        instanceB.instanceId = InventoryInstances.createInstanceViaApi(
          instanceB.instanceName,
          instanceB.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceB.instanceId}"`,
        }).then((holdings) => {
          instanceB.holdingHRID = holdings[0].hrid;
          instanceB.holdingsUUID = holdings[0].id;

          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            administrativeNotes: [notes.administrative],
          });
        });

        FileManager.createFile(
          `cypress/fixtures/${itemBarcodesFileName}`,
          `${instanceA.itemBarcode}\n${instanceB.itemBarcode}`,
        );

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceA.instanceId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceB.instanceId);
      InventoryInstances.deleteHoldingsNoteTypeViaApi(noteTypeId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C422061 Verify Bulk Edit actions for Holdings notes - edit note of new note type and containing 32000 characters (firebird)',
      { tags: ['criticalPath', 'firebird', 'C422061'] },
      () => {
        // Step 1: Select Holdings record type and Item barcodes identifier
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item barcodes');

        // Step 2-3: Upload file and verify matched results
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instanceA.holdingHRID, instanceB.holdingHRID);

        // Step 4: Show columns for Administrative note and custom note type
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          specialNoteTypeName,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
        );
        BulkEditSearchPane.verifyResultColumnTitles(specialNoteTypeName, true);

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instanceA.holdingHRID,
          specialNoteTypeName,
          notes.customNoteType,
        );

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          instanceB.holdingHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          notes.administrative,
        );

        // Step 5: Download matched records CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        FileManager.verifyFileIncludes(matchedRecordsFileName, [
          instanceA.holdingsUUID,
          notes.customNoteType,
        ]);
        FileManager.verifyFileIncludes(matchedRecordsFileName, [
          instanceB.holdingsUUID,
          notes.administrative,
        ]);

        // Step 6: Open bulk edit form
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyCancelButtonDisabled(false);
        BulkEditActions.verifyConfirmButtonDisabled(true);

        // Steps 7-8: Select Administrative note option
        BulkEditActions.selectOption(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
        );

        // Steps 9-11: Select "Change note type" and choose the custom note type
        BulkEditActions.changeNoteType(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          specialNoteTypeName,
        );
        cy.wait(1000);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 12: Add new bulk edit row
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);
        BulkEditActions.verifyConfirmButtonDisabled(true);
        cy.wait(1000);

        // Steps 13-14: Select custom note type and "Mark as staff only"
        BulkEditActions.selectOption(specialNoteTypeName, 1);
        cy.wait(1000);
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, 1);
        BulkEditActions.verifyActionSelected(BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 15: Confirm changes
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instanceA.holdingHRID,
          specialNoteTypeName,
          `${notes.customNoteType} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instanceB.holdingHRID,
          specialNoteTypeName,
          `${notes.administrative} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instanceB.holdingHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          '',
        );

        // Step 16: Download preview CSV
        BulkEditActions.downloadPreview();
        FileManager.verifyFileIncludes(previewFileName, [
          instanceA.holdingsUUID,
          `${notes.customNoteType} (staff only)`,
        ]);
        FileManager.verifyFileIncludes(previewFileName, [
          instanceB.holdingsUUID,
          `${notes.administrative} (staff only)`,
        ]);

        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instanceB.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          '',
        );

        // Step 17: Commit changes
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(2);

        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instanceA.holdingHRID,
          specialNoteTypeName,
          `${notes.customNoteType} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instanceB.holdingHRID,
          specialNoteTypeName,
          `${notes.administrative} (staff only)`,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instanceB.holdingHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          '',
        );

        // Step 18: Download changed records CSV
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        FileManager.verifyFileIncludes(changedRecordsFileName, [
          instanceA.holdingsUUID,
          `${notes.customNoteType} (staff only)`,
        ]);
        FileManager.verifyFileIncludes(changedRecordsFileName, [
          instanceB.holdingsUUID,
          `${notes.administrative} (staff only)`,
        ]);

        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instanceA.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
          '',
        );

        // Step 19: Verify changes in Inventory for instance A
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instanceA.holdingHRID);
        InventorySearchAndFilter.selectFoundInstance(instanceA.instanceName);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkNotesByType(0, specialNoteTypeName, notes.customNoteType, 'Yes');

        // Verify changes in Inventory for instance B
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instanceB.holdingHRID);
        InventorySearchAndFilter.selectFoundInstance(instanceB.instanceName);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.checkAdministrativeNote('-');
        HoldingsRecordView.checkNotesByType(0, specialNoteTypeName, notes.administrative, 'Yes');
      },
    );
  });
});
