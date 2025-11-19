import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import {
  BULK_EDIT_ACTIONS,
  BULK_EDIT_FORMS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let sourceId;
let materialTypeId;
const itemUUIDsFileName = `itemUUIDs-${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Material specified;URL public note\n';

const itemWithoutElectronicAccess = {
  instanceTitle: `AT_C877132_Instance_NoElectronicAccess_${getRandomPostfix()}`,
  barcode: `item_no_ea_${getRandomPostfix()}`,
};

const itemWithElectronicAccess = {
  instanceTitle: `AT_C877132_Instance_WithElectronicAccess_${getRandomPostfix()}`,
  barcode: `item_with_ea_${getRandomPostfix()}`,
  electronicAccess: {
    uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
    linkText: 'eBooks on EBSCOhost',
    materialsSpecification: 'Table of contents only',
    publicNote:
      'FTP access to PostScript version includes groups of article files with .pdf extension',
    relationshipId: null,
  },
};

const itemWithMultipleElectronicAccess = {
  instanceTitle: `AT_C877132_Instance_WithMultipleElectronicAccess_${getRandomPostfix()}`,
  barcode: `item_multiple_ea_${getRandomPostfix()}`,
  electronicAccess: [
    {
      uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
      linkText: '',
      materialsSpecification: '',
      publicNote: '',
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
      relationshipId: null,
    },
    {
      uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
      linkText: 'eBooks on EBSCOhost',
      materialsSpecification: '',
      publicNote: '',
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
      relationshipId: null,
    },
    {
      uri: 'http://search.ebscohost.com/login.aspx?direct=true&scope=site&db=e000xna&AN=281338',
      linkText: 'eBooks on EBSCOhost',
      materialsSpecification: 'Table of contents only',
      publicNote:
        'FTP access to PostScript version includes groups of article files with .pdf extension',
      relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
      relationshipId: null,
    },
  ],
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
        permissions.bulkEditLogsView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;
        });
        cy.getLocations({ limit: 1 }).then((res) => {
          locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          materialTypeId = res.id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          sourceId = folioSource.id;

          // Get URL relationships for electronic access
          cy.wrap([
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE,
          ]).each((relationshipName) => {
            UrlRelationship.getViaApi({ query: `name=="${relationshipName}"` }).then(
              (relationships) => {
                if (relationshipName === ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE) {
                  itemWithElectronicAccess.electronicAccess.relationshipId = relationships[0].id;
                  itemWithMultipleElectronicAccess.electronicAccess[0].relationshipId =
                    relationships[0].id;
                } else if (
                  relationshipName === ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE
                ) {
                  itemWithMultipleElectronicAccess.electronicAccess[1].relationshipId =
                    relationships[0].id;
                } else if (
                  relationshipName === ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RELATED_RESOURCE
                ) {
                  itemWithMultipleElectronicAccess.electronicAccess[2].relationshipId =
                    relationships[0].id;
                }
              },
            );
          });

          // Create item without electronic access
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: itemWithoutElectronicAccess.instanceTitle,
            },
          }).then((createdInstanceData) => {
            itemWithoutElectronicAccess.instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: itemWithoutElectronicAccess.instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              InventoryItems.createItemViaApi({
                barcode: itemWithoutElectronicAccess.barcode,
                holdingsRecordId: holding.id,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                itemWithoutElectronicAccess.itemId = item.id;
                itemWithoutElectronicAccess.itemHrid = item.hrid;
              });
            });
          });

          // Create item with electronic access
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: itemWithElectronicAccess.instanceTitle,
            },
          }).then((createdInstanceData) => {
            itemWithElectronicAccess.instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: itemWithElectronicAccess.instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              InventoryItems.createItemViaApi({
                barcode: itemWithElectronicAccess.barcode,
                holdingsRecordId: holding.id,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                electronicAccess: [itemWithElectronicAccess.electronicAccess],
              }).then((item) => {
                itemWithElectronicAccess.itemId = item.id;
                itemWithElectronicAccess.itemHrid = item.hrid;
              });
            });
          });

          // Create item with multiple electronic access entries
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: itemWithMultipleElectronicAccess.instanceTitle,
            },
          }).then((createdInstanceData) => {
            itemWithMultipleElectronicAccess.instanceId = createdInstanceData.instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: itemWithMultipleElectronicAccess.instanceId,
              permanentLocationId: locationId,
              sourceId,
            }).then((holding) => {
              InventoryItems.createItemViaApi({
                barcode: itemWithMultipleElectronicAccess.barcode,
                holdingsRecordId: holding.id,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                electronicAccess: itemWithMultipleElectronicAccess.electronicAccess,
              }).then((item) => {
                itemWithMultipleElectronicAccess.itemId = item.id;
                itemWithMultipleElectronicAccess.itemHrid = item.hrid;

                // Create CSV file with item UUIDs
                FileManager.createFile(
                  `cypress/fixtures/${itemUUIDsFileName}`,
                  `${itemWithoutElectronicAccess.itemId}\n${itemWithElectronicAccess.itemId}\n${itemWithMultipleElectronicAccess.itemId}`,
                );
              });
            });
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
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        itemWithoutElectronicAccess.instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        itemWithElectronicAccess.instanceId,
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        itemWithMultipleElectronicAccess.instanceId,
      );
      FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
      BulkEditFiles.deleteAllDownloadedFiles(fileNames);
    });

    it(
      'C877132 Verify rendering "Electronic access" data of Item record in bulk edit forms and files (firebird)',
      { tags: ['extendedPath', 'firebird', 'C877132'] },
      () => {
        // Step 1: Click "Actions" menu, Check "Electronic access" checkbox under "Show columns" subsection
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.uploadFile(itemUUIDsFileName);
        BulkEditSearchPane.checkForUploading(itemUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyPaneRecordsCount('3 item');
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
        );
        BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
          true,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
        );
        BulkEditSearchPane.verifyResultColumnTitles(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
        );

        // Step 2: Check display of "Electronic access" Item data in the "Preview of records matched" table
        // For Item without populated "Electronic access" data column is not populated
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );

        // For Item with "Electronic access" data column is populated with electronic access table
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
          itemWithElectronicAccess.itemHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          itemWithElectronicAccess.electronicAccess.uri,
          itemWithElectronicAccess.electronicAccess.linkText,
          itemWithElectronicAccess.electronicAccess.materialsSpecification,
          itemWithElectronicAccess.electronicAccess.publicNote,
        );

        // For Item with multiple "Electronic access" entries
        itemWithMultipleElectronicAccess.electronicAccess.forEach((access) => {
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            itemWithMultipleElectronicAccess.itemHrid,
            access.relationshipName,
            access.uri,
            access.linkText || '-',
            access.materialsSpecification || '-',
            access.publicNote || '-',
          );
        });

        // Step 3: Download matched records (CSV) and check display of "Electronic access" Item data
        BulkEditActions.openActions();
        BulkEditActions.downloadMatchedResults();

        // Verify item without electronic access has empty electronic access column
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );

        // Verify item with electronic access
        const singleElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE};${itemWithElectronicAccess.electronicAccess.uri};${itemWithElectronicAccess.electronicAccess.linkText};${itemWithElectronicAccess.electronicAccess.materialsSpecification};${itemWithElectronicAccess.electronicAccess.publicNote}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          singleElectronicAccessInFile,
        );

        // Verify item with multiple electronic access entries
        const multipleElectronicAccessInFile = `${electronicAccessTableHeadersInFile}${itemWithMultipleElectronicAccess.electronicAccess
          .map((access) => {
            return `${access.relationshipName};${access.uri};${access.linkText || '-'};${access.materialsSpecification || '-'};${access.publicNote || '-'}`;
          })
          .join('|')}`;

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithMultipleElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          multipleElectronicAccessInFile,
        );

        // Step 4: Start bulk edit - Select any option and any action to edit Item records, Click "Confirm changes"
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyModifyLandingPageBeforeModifying();
        BulkEditActions.selectOption('Suppress from discovery');
        BulkEditActions.selectAction(BULK_EDIT_ACTIONS.SET_TRUE);
        BulkEditActions.verifyConfirmButtonDisabled(false);
        BulkEditActions.confirmChanges();

        // Step 5: Check display of "Electronic access" Item data in "Preview of records to be changed" table
        BulkEditActions.verifyMessageBannerInAreYouSureForm(3);

        // For Item without populated "Electronic access" data column is not populated in "Are you sure" form
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );

        // For Item with "Electronic access" - verify data is rendered consistently
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.ARE_YOU_SURE,
          itemWithElectronicAccess.itemHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          itemWithElectronicAccess.electronicAccess.uri,
          itemWithElectronicAccess.electronicAccess.linkText,
          itemWithElectronicAccess.electronicAccess.materialsSpecification,
          itemWithElectronicAccess.electronicAccess.publicNote,
        );

        // For Item with multiple "Electronic access" entries in "Are you sure" form
        itemWithMultipleElectronicAccess.electronicAccess.forEach((access) => {
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            itemWithMultipleElectronicAccess.itemHrid,
            access.relationshipName,
            access.uri,
            access.linkText || '-',
            access.materialsSpecification || '-',
            access.publicNote || '-',
          );
        });

        // Also verify suppress from discovery change
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 6: Download preview in CSV format and check display of "Electronic access" Item data
        BulkEditActions.downloadPreview();

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          singleElectronicAccessInFile,
        );

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithMultipleElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          multipleElectronicAccessInFile,
        );

        // Verify suppress from discovery in preview CSV
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          true,
        );

        // Step 7: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditActions.verifySuccessBanner(3);
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 8: Check display of "Electronic access" Item data in "Preview of records changed" table
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );

        // For Item with "Electronic access" - verify data is rendered consistently in "Preview of records changed" form
        BulkEditSearchPane.verifyElectronicAccessTableInForm(
          BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
          itemWithElectronicAccess.itemHrid,
          ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          itemWithElectronicAccess.electronicAccess.uri,
          itemWithElectronicAccess.electronicAccess.linkText,
          itemWithElectronicAccess.electronicAccess.materialsSpecification,
          itemWithElectronicAccess.electronicAccess.publicNote,
        );

        // For Item with multiple "Electronic access" entries in "Preview of records changed" form
        itemWithMultipleElectronicAccess.electronicAccess.forEach((access, index) => {
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            itemWithMultipleElectronicAccess.itemHrid,
            access.relationshipName,
            access.uri,
            access.linkText || '-',
            access.materialsSpecification || '-',
            access.publicNote || '-',
            index,
          );
        });

        // Step 9: Download changed records (CSV) and check display of "Electronic access" Item data
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();

        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          singleElectronicAccessInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithMultipleElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          multipleElectronicAccessInFile,
        );

        // remove earlier downloaded files
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);

        // Step 10: Navigate to "Logs" tab of Bulk edit, Check "Inventory - items" checkbox on "Record types" filter
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);

        // Step 11: Click on the "..." action element in the row with the recently completed Bulk Edit job
        BulkEditLogs.verifyLogsRowActionWhenCompleted();

        // Step 12: Click on the "File with the matching records" hyperlink, Check display of "Electronic access" Item data
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          singleElectronicAccessInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.matchedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithMultipleElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          multipleElectronicAccessInFile,
        );

        // Step 13: Click on the "File with the preview of proposed changes (CSV)" hyperlink, Check display of "Electronic access" Item data
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          singleElectronicAccessInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.previewRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithMultipleElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          multipleElectronicAccessInFile,
        );

        // Step 14: Click on the "File with updated records (CSV)" hyperlink, Check display of "Electronic access" Item data
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithoutElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          '',
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          singleElectronicAccessInFile,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          fileNames.changedRecordsCSV,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
          itemWithMultipleElectronicAccess.itemHrid,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
          multipleElectronicAccessInFile,
        );
      },
    );
  });
});
