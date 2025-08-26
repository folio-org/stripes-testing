import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  LOCATION_NAMES,
  HOLDING_NOTE_TYPES,
} from '../../../support/constants';

let user;
const instance = {
  title: `C446039 testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const copyNoteText = 'Copy note text';
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(holdingUUIDsFileName);
const previewFileName = BulkEditFiles.getPreviewFileName(holdingUUIDsFileName);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(holdingUUIDsFileName);

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        instance.id = InventoryInstances.createInstanceViaApi(instance.title, instance.itemBarcode);
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instance.id}"`,
        }).then((holdings) => {
          instance.holdingHRID = holdings[0].hrid;
          instance.holdingsUUID = holdings[0].id;

          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(
        matchedRecordsFileName,
        previewFileName,
        changedRecordsFileName,
      );
    });

    it(
      'C446039 Verify column names under "Show columns" section - holdings (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446039'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.holdingHRID);
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyHoldingActionShowColumns();
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SOURCE,
          'FOLIO',
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TYPE,
          '',
        );
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
          LOCATION_NAMES.MAIN_LIBRARY_UI,
        );

        const uncheckedColumnHeaders = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TYPE,
        ];
        const checkedColumnHeaders = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
        ];

        BulkEditSearchPane.changeShowColumnCheckbox(
          ...checkedColumnHeaders,
          ...uncheckedColumnHeaders,
        );
        cy.wait(1000);

        checkedColumnHeaders.forEach((columnHeader) => {
          BulkEditSearchPane.verifyResultColumnTitles(columnHeader);
        });
        uncheckedColumnHeaders.forEach((columnHeader) => {
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(columnHeader);
        });

        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();
        BulkEditFiles.verifyValueInRowByUUID(
          matchedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          instance.holdingHRID,
        );

        const defaultColumnHeaders = Object.values(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS,
        ).slice(0, -2);

        BulkEditFiles.verifyColumnHeaderExistsInCsvFile(
          matchedRecordsFileName,
          defaultColumnHeaders,
        );
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.selectOption(HOLDING_NOTE_TYPES.COPY_NOTE);
        cy.wait(1000);
        BulkEditActions.selectAction('Add note');
        BulkEditActions.fillInFirstTextArea(copyNoteText);
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          [instance.holdingHRID],
        );
        BulkEditActions.verifyChangesInAreYouSureForm(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          [copyNoteText],
        );

        const selectedColumnHeaders = [
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SOURCE,
          ...checkedColumnHeaders,
        ];

        selectedColumnHeaders.forEach((selectedColumnHeader) => {
          BulkEditSearchPane.verifyAreYouSureColumnTitlesInclude(selectedColumnHeader);
        });
        uncheckedColumnHeaders.forEach((uncheckedColumnHeader) => {
          BulkEditSearchPane.verifyAreYouSureColumnTitlesDoNotInclude(uncheckedColumnHeader);
        });

        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          copyNoteText,
        );
        BulkEditFiles.verifyColumnHeaderExistsInCsvFile(previewFileName, defaultColumnHeaders);
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner();
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.holdingHRID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          copyNoteText,
        );

        selectedColumnHeaders.forEach((selectedColumnHeader) => {
          BulkEditSearchPane.verifyChangedColumnTitlesInclude(selectedColumnHeader);
        });
        uncheckedColumnHeaders.forEach((uncheckedColumnHeader) => {
          BulkEditSearchPane.verifyChangedColumnTitlesDoNotInclude(uncheckedColumnHeader);
        });

        BulkEditActions.openActions();
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
          instance.holdingsUUID,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.COPY_NOTE,
          copyNoteText,
        );
        BulkEditFiles.verifyColumnHeaderExistsInCsvFile(previewFileName, defaultColumnHeaders);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchHoldingsByHRID(instance.holdingHRID);
        InventorySearchAndFilter.selectViewHoldings();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkNotesByType(0, HOLDING_NOTE_TYPES.COPY_NOTE, copyNoteText);
      },
    );
  });
});
