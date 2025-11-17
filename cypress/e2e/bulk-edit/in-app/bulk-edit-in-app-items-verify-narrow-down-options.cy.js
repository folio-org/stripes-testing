import Permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BULK_EDIT_ACTIONS, ITEM_STATUS_NAMES, LOAN_TYPE_NAMES } from '../../../support/constants';

let user;
const instance = {
  title: `AT_C356778_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `itemBarcodes_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.createInstanceViaApi(instance.title, instance.itemBarcode);
        FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, instance.itemBarcode);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
    });

    it(
      'C356778 Verify narrow down options dropdown choices on Items in-app bulk edit form (firebird)',
      { tags: ['extendedPath', 'firebird', 'C356778'] },
      () => {
        const allOptions = [
          'Administrative note',
          'Check in note',
          'Check out note',
          'Action note',
          'Binding',
          'Copy note',
          'Electronic bookplate',
          'Note',
          'Provenance',
          'Reproduction',
          'Item status',
          'Permanent loan type',
          'Temporary loan type',
          'Permanent item location',
          'Temporary item location',
          'Suppress from discovery',
        ];
        const selectedOptions = [];

        // Helper function to verify options availability
        function verifyOptionsState(availableOptions, unavailableOptions = []) {
          availableOptions.forEach((option) => {
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(option);
          });
          unavailableOptions.forEach((option) => {
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(option, false);
          });
        }

        // Helper function to add option and verify state
        function selectOptionAndVerifyState(option, action, rowIndex, specialHandler = null) {
          selectedOptions.push(option);

          if (specialHandler) {
            specialHandler(rowIndex);
          } else {
            BulkEditActions.selectOption(option, rowIndex);
            BulkEditActions.selectSecondAction(action, rowIndex);
          }

          BulkEditActions.verifyConfirmButtonDisabled(false);

          if (rowIndex < 15) {
            BulkEditActions.addNewBulkEditFilterString();
            if (rowIndex < 14) BulkEditActions.verifyNewBulkEditRow(rowIndex + 1);
            BulkEditActions.clickOptionsSelection(rowIndex + 1);

            verifyOptionsState(
              allOptions.filter((opt) => !selectedOptions.includes(opt)),
              selectedOptions,
            );
            BulkEditActions.clickOptionsSelection(rowIndex + 1);
          }
        }

        // Step 1: Select "Inventory-items" record type => Select "Items barcode" from "Record identifier" dropdown
        BulkEditSearchPane.waitLoading();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        // Step 2: Upload a .csv file with items barcodes by dragging it on the file drag and drop area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();

        // Step 3: Check the result of uploading the .csv file with Items barcodes
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);

        // Step 4: Click "Actions" menu => Select "Start Bulk edit" option
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();

        // Step 5: Click "Select option" dropdown in "Options" column under "Bulk edits" accordion
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.clickOptionsSelection();

        verifyOptionsState(allOptions);

        BulkEditActions.clickOptionsSelection();

        // Step 6: Select "Administrative note" option => Select "Remove all" action
        BulkEditActions.selectOption('Administrative note');
        BulkEditActions.selectSecondAction(BULK_EDIT_ACTIONS.REMOVE_ALL);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        selectedOptions.push('Administrative note');

        // Step 7: Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);

        // Step 8-13: Test note options with progressive narrowing
        const noteOptionsWithActions = [
          { option: 'Check in note', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 1 },
          { option: 'Check out note', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 2 },
          { option: 'Action note', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 3 },
          { option: 'Binding', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 4 },
          { option: 'Copy note', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 5 },
          {
            option: 'Electronic bookplate',
            action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
            rowIndex: 6,
          },
          { option: 'Note', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 7 },
          { option: 'Provenance', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 8 },
          { option: 'Reproduction', action: BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY, rowIndex: 9 },
        ];

        noteOptionsWithActions.forEach((noteConfig) => {
          selectOptionAndVerifyState(noteConfig.option, noteConfig.action, noteConfig.rowIndex);
        });

        // Step 14: Select "Item status" option
        selectOptionAndVerifyState('Item status', null, 10, (rowIndex) => {
          BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.AVAILABLE, rowIndex);
        });

        // Step 15: Select "Permanent loan type" option
        selectOptionAndVerifyState('Permanent loan type', null, 11, (rowIndex) => {
          BulkEditActions.fillPermanentLoanType(LOAN_TYPE_NAMES.COURSE_RESERVES, rowIndex);
        });

        // Steps 16-18: Test remaining options
        const remainingOptionsWithActions = [
          { option: 'Temporary loan type', action: BULK_EDIT_ACTIONS.CLEAR_FIELD, rowIndex: 12 },
          {
            option: 'Permanent item location',
            action: BULK_EDIT_ACTIONS.CLEAR_FIELD,
            rowIndex: 13,
          },
          {
            option: 'Temporary item location',
            action: BULK_EDIT_ACTIONS.CLEAR_FIELD,
            rowIndex: 14,
          },
        ];

        remainingOptionsWithActions.forEach((config) => {
          selectOptionAndVerifyState(config.option, config.action, config.rowIndex);
        });

        // Step 19: Click "Select option" dropdown on the final row
        BulkEditActions.clickOptionsSelection(15);

        verifyOptionsState(['Suppress from discovery'], selectedOptions);

        BulkEditActions.clickOptionsSelection(15);

        // Step 20: Select "Suppress from discovery" option => Select "Set true" in "Select action" dropdown
        BulkEditActions.selectOption('Suppress from discovery', 15);
        BulkEditActions.selectSecondAction(BULK_EDIT_ACTIONS.SET_TRUE, 15);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.verifyCancelButtonDisabled(false);

        allOptions.forEach((_, index) => {
          BulkEditActions.verifyPlusButtonAbsentInRow(true, index);
          BulkEditActions.verifyDeleteButtonExistsInRow(true, index);
        });
      },
    );
  });
});
