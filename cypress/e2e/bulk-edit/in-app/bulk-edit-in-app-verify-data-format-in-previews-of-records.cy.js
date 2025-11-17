import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_FORMS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  CALL_NUMBER_TYPE_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';

let user;
const instance = {
  title: `AT_C380545_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const itemBarcodesFileName = `validItemBarcodes_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemBarcodesFileName, true);
const callNumber = `AT_C380545_CallNumber_${getRandomPostfix()}`;
const callNumberPrefix = 'PREF';
const callNumberSuffix = 'SUFF';
const electronicAccessData = {
  uri: 'https://example.com/test-resource',
  linkText: 'Test Electronic Resource',
  materialsSpecification: 'Test Materials',
  publicNote: 'Test public note for electronic access',
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditLogsView.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        InventoryInstances.getCallNumberTypes({
          query: `name="${CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL}"`,
        }).then((res) => {
          instance.callNumberTypeId = res[0].id;
        });
        UrlRelationship.getViaApi({
          query: `name="${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE}"`,
        }).then((relationships) => {
          instance.relationshipId = relationships[0].id;
        });

        instance.instanceId = InventoryInstances.createInstanceViaApi(
          instance.title,
          instance.itemBarcode,
        );

        cy.getItems({
          limit: 1,
          expandAll: true,
          query: `"barcode"=="${instance.itemBarcode}"`,
        }).then((item) => {
          instance.itemId = item.id;
          instance.itemHrid = item.hrid;
          item.itemLevelCallNumber = callNumber;
          item.itemLevelCallNumberPrefix = callNumberPrefix;
          item.itemLevelCallNumberSuffix = callNumberSuffix;
          item.itemLevelCallNumberTypeId = instance.callNumberTypeId;
          const electronicAccessWithRelationship = {
            ...electronicAccessData,
            relationshipId: instance.relationshipId,
          };
          item.electronicAccess = [electronicAccessWithRelationship];

          cy.updateItemViaApi(item);

          FileManager.createFile(`cypress/fixtures/${itemBarcodesFileName}`, instance.itemBarcode);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${itemBarcodesFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C380545 Verify data format in Previews of records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C380545'] },
      () => {
        // Step 1: Select the "Inventory - items" radio button => Select "Item barcodes" option from the "Record identifier" dropdown
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item barcodes');

        // Step 2: Upload a .csv file with Item barcodes by dragging it on the "Drag & drop" area
        BulkEditSearchPane.uploadFile(itemBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(instance.itemBarcode);

        // Step 3: Click "Actions" => Check the checkboxes next to the "Effective call number" and "Electronic access"
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.EFFECTIVE_CALL_NUMBER,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
        );

        // Step 4: Check the values under the columns: "Status", "Effective call number", "Electronic access"
        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.AVAILABLE,
        );

        const expectedEffectiveCallNumber = `${callNumberPrefix} ${callNumber} ${callNumberSuffix}`;

        BulkEditSearchPane.verifyResultsUnderColumns(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.EFFECTIVE_CALL_NUMBER,
          expectedEffectiveCallNumber,
        );
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          instance.itemHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          electronicAccessData.uri,
          electronicAccessData.linkText,
          electronicAccessData.materialsSpecification,
          electronicAccessData.publicNote,
        );

        // Step 5: Click "Actions" menu => Select the "Start bulk edit" element
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();

        // Step 6: Click "Select Option" dropdown => Select "Permanent item location" option
        BulkEditActions.selectOption('Permanent item location');

        // Step 7: Click "Select action" dropdown => Select "Clear field" option
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.CLEAR_FIELD);

        // Step 8: Click on the "Plus" icon
        BulkEditActions.addNewBulkEditFilterString();
        BulkEditActions.verifyNewBulkEditRow(1);

        // Step 9-10: Click on the "Select option" dropdown => Select "Item status" option
        BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.MISSING, 1);
        BulkEditActions.verifyConfirmButtonDisabled(false);

        // Step 11: Click "Confirm changes" button
        BulkEditActions.confirmChanges();
        BulkEditActions.verifyAreYouSureForm(1);

        // Step 12: Check the values under the columns in preview: "Status", "Effective call number", "Electronic access"
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.MISSING,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.EFFECTIVE_CALL_NUMBER,
          expectedEffectiveCallNumber,
        );
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          instance.itemHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          electronicAccessData.uri,
          electronicAccessData.linkText,
          electronicAccessData.materialsSpecification,
          electronicAccessData.publicNote,
        );

        // Step 13: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);

        // Step 14: Check the values under the columns in final results: "Status", "Effective call number", "Electronic access"
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          ITEM_STATUS_NAMES.MISSING,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          instance.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.EFFECTIVE_CALL_NUMBER,
          expectedEffectiveCallNumber,
        );
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          instance.itemHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          electronicAccessData.uri,
          electronicAccessData.linkText,
          electronicAccessData.materialsSpecification,
          electronicAccessData.publicNote,
        );

        // Step 15: Navigate to the "Inventory" app => Find and open updated Items records => Make sure that changes were applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', instance.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.MISSING);
        ItemRecordView.verifyEffectiveCallNumber(expectedEffectiveCallNumber);
        ItemRecordView.checkElectronicAccess(
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          electronicAccessData.uri,
          electronicAccessData.linkText,
          electronicAccessData.materialsSpecification,
          electronicAccessData.publicNote,
        );
      },
    );
  });
});
