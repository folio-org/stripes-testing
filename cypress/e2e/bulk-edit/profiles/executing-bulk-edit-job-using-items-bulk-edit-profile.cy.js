import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../support/fragments/bulk-edit/query-modal';
import SelectBulkEditProfileModal from '../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import getRandomPostfix from '../../../support/utils/stringTools';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { APPLICATION_NAMES, BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';

let user;
let bulkEditJobId;
let queryFileNames;
const testData = {
  folioInstanceTitle: `AT_C740244_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
  profileName: null,
  profileId: null,
  instanceId: null,
  itemId: null,
  holdingId: null,
  profileBody: {
    name: `AT_C740244_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    locked: false,
    entityType: 'ITEM',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'FIND_AND_REMOVE_THESE',
            initial: 'admin',
            updated: null,
          },
        ],
      },
      {
        option: 'SUPPRESS_FROM_DISCOVERY',
        actions: [
          {
            type: 'SET_TO_FALSE',
            initial: null,
            updated: null,
          },
        ],
      },
      {
        option: 'ITEM_NOTE',
        actions: [
          {
            type: 'MARK_AS_STAFF_ONLY',
            initial: null,
            updated: null,
            parameters: [
              {
                key: 'ITEM_NOTE_TYPE_ID_KEY',
                value: null, // Will be set to Action note type ID
              },
              {
                key: 'STAFF_ONLY',
                value: false,
                onlyForActions: ['ADD_TO_EXISTING'],
              },
            ],
          },
        ],
      },
      {
        option: 'CHECK_IN_NOTE',
        actions: [
          {
            type: 'CHANGE_TYPE',
            initial: null,
            updated: null, // Will be set to Note type ID
            parameters: [
              {
                key: 'STAFF_ONLY',
                value: false,
                onlyForActions: ['ADD_TO_EXISTING'],
              },
            ],
          },
        ],
      },
      {
        option: 'CHECK_OUT_NOTE',
        actions: [
          {
            type: 'REMOVE_MARK_AS_STAFF_ONLY',
            initial: null,
            updated: null,
            parameters: [
              {
                key: 'STAFF_ONLY',
                value: false,
                onlyForActions: ['ADD_TO_EXISTING'],
              },
            ],
          },
        ],
      },
      {
        option: 'PERMANENT_LOAN_TYPE',
        actions: [
          {
            type: 'REPLACE_WITH',
            initial: null,
            updated: null, // Will be set to loan type ID
          },
        ],
      },
    ],
  },
  secondProfileBody: {
    name: `Test_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    locked: false,
    entityType: 'ITEM',
    ruleDetails: [
      {
        option: 'ADMINISTRATIVE_NOTE',
        actions: [
          {
            type: 'FIND_AND_REMOVE_THESE',
            initial: 'admin',
            updated: null,
          },
        ],
      },
    ],
  },
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditEdit.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.bulkEditLogsView.gui,
        Permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Get Action note type ID
        InventoryInstances.getItemNoteTypes({ query: 'name="Action note"' }).then((noteTypes) => {
          testData.profileBody.ruleDetails[2].actions[0].parameters[0].value = noteTypes[0].id;

          // Get Note type ID for check-in note change
          InventoryInstances.getItemNoteTypes({ query: 'name="Note"' }).then((generalNoteTypes) => {
            testData.profileBody.ruleDetails[3].actions[0].updated = generalNoteTypes[0].id;

            // Get permanent loan type ID
            cy.getLoanTypes({ query: 'name="Reading room"' }).then((loanTypes) => {
              testData.profileBody.ruleDetails[5].actions[0].updated = loanTypes[0].id;

              // Create second profile to verify search and sorting
              cy.createBulkEditProfile(testData.secondProfileBody).then((profile) => {
                testData.secondProfileName = profile.name;
                testData.secondProfileId = profile.id;
              });

              // Create bulk edit profile
              cy.createBulkEditProfile(testData.profileBody).then((profile) => {
                testData.profileName = profile.name;
                testData.profileId = profile.id;

                // Create instance with item having required attributes
                testData.instanceId = InventoryInstances.createInstanceViaApi(
                  testData.folioInstanceTitle,
                  testData.itemBarcode,
                );

                // Update item with required notes and settings
                cy.getItems({
                  limit: 1,
                  expandAll: true,
                  query: `"barcode"=="${testData.itemBarcode}"`,
                }).then((items) => {
                  const item = items[0];
                  //  testData.itemId = item.id;
                  // testData.holdingId = item.holdingsRecordId;

                  // Update item with test data
                  item.administrativeNotes = ['admin note for testing'];
                  item.discoverySuppress = true;
                  item.notes = [
                    {
                      itemNoteTypeId: noteTypes[0].id,
                      note: 'Action note not marked as staff only',
                      staffOnly: false,
                    },
                  ];
                  item.circulationNotes = [
                    {
                      noteType: 'Check in',
                      note: 'Check in note text',
                      staffOnly: false,
                    },
                    {
                      noteType: 'Check out',
                      note: 'Check out note text',
                      staffOnly: true,
                    },
                  ];

                  cy.updateItemViaApi(item);
                });
              });
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        // Build and execute query as part of preconditions
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(itemFieldValues.itemBarcode);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.fillInValueTextfield(testData.itemBarcode);
        cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
        QueryModal.clickTestQuery();
        QueryModal.verifyPreviewOfRecordsMatched();
        QueryModal.clickRunQuery();
        QueryModal.verifyClosed();
        cy.wait('@getPreview', getLongDelay()).then((interception) => {
          const interceptedUuid = interception.request.url.match(
            /bulk-operations\/([a-f0-9-]+)\/preview/,
          )[1];
          bulkEditJobId = interceptedUuid;
          queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(bulkEditJobId, true);
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteBulkEditProfile(testData.profileId, true);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      if (queryFileNames) {
        BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);
      }
    });

    it(
      'C740244 Executing bulk edit job using Items bulk edit profile (Query, Logs) (firebird)',
      { tags: ['smoke', 'firebird', 'C740244'] },
      () => {
        // Step 1: Click "Actions" menu
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

        // Step 2: In the list of available column names uncheck checkboxes next to the options
        BulkEditSearchPane.uncheckShowColumnCheckbox(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
        );

        // Step 3: Click "Select items bulk edit profile"
        BulkEditActions.clickSelectBulkEditProfile('items');
        SelectBulkEditProfileModal.waitLoading('items');
        SelectBulkEditProfileModal.verifyAllModalElements();

        // Step 4-5: Verify the table with the list of existing items bulk edit profiles and count
        SelectBulkEditProfileModal.verifyProfileInTable(testData.profileName);
        SelectBulkEditProfileModal.verifyProfilesSortedByName();
        SelectBulkEditProfileModal.changeSortOrderByName();
        SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
        SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
        SelectBulkEditProfileModal.verifyProfilesSortedByName('none');
        SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate('none');
        SelectBulkEditProfileModal.verifyProfilesSortedByName('none');
        SelectBulkEditProfileModal.searchProfile('at_C740244');
        SelectBulkEditProfileModal.verifyProfileInTable(testData.profileName);
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
        SelectBulkEditProfileModal.searchProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyProfileInTable(testData.profileName);
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);

        // Step 6: Click on the row with items bulk edit profile from Preconditions
        SelectBulkEditProfileModal.selectProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyModalClosed();
        BulkEditActions.verifyAreYouSureForm();

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            value: false,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            value: 'Action note not marked as staff only (Staff only)',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            value: 'Check out note text',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            value: 'Check in note text',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
            value: 'Reading room',
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          testData.itemBarcode,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 7: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          testData.itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          editedHeaderValues,
        );

        // Step 8: Click "Commit changes" button
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
          testData.itemBarcode,
          editedHeaderValues,
        );

        // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          testData.itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          editedHeaderValues,
        );

        // Step 10: Click "Logs" toggle in "Set criteria" pane and Check "Inventory - items" checkbox
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.clickActionsRunBy(user.username);

        // Step 11: Click on the "..." action element in the row with recently completed bulk edit job
        BulkEditLogs.verifyLogsRowActionWhenCompletedWithQuery();

        // Step 12: Click on the "File with identifiers of the records affected by bulk update"
        BulkEditLogs.downloadQueryIdentifiers();
        ExportFile.verifyFileIncludes(queryFileNames.identifiersQueryFilename, [testData.itemId]);

        // Step 13: Click on the "File with the matching records" hyperlink
        BulkEditLogs.downloadFileWithMatchingRecords();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.matchedRecordsQueryFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          testData.itemId,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'true',
        );

        // Step 14: Click on the "File with the preview of proposed changes (CSV)" hyperlink
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          testData.itemId,
          editedHeaderValues,
        );

        // Step 15: Click on the "File with updated records (CSV)" hyperlink
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
          testData.itemId,
          editedHeaderValues,
        );

        // Step 16: Navigate to the "Inventory" app => Search for the recently edited Items => Verify that made changes have been applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', testData.itemBarcode);
        ItemRecordView.waitLoading();

        // Verify all changes have been applied
        ItemRecordView.checkItemAdministrativeNote('');
        ItemRecordView.suppressedAsDiscoveryIsAbsent();
        ItemRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'Yes',
          'Action note',
          'Action note not marked as staff only',
        );
        ItemRecordView.checkMultipleItemNotesWithStaffOnly(1, 'No', 'Note', 'Check in note text');
        ItemRecordView.checkCheckOutNote('Check out note text', 'No');
        ItemRecordView.verifyPermanentLoanType('Reading room');
      },
    );
  });
});
