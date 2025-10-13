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
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createSuppressFromDiscoveryRule,
  ItemsRules,
  ActionCreators,
} from '../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const {
  createItemNoteRule,
  createCheckInNoteRule,
  createCheckOutNoteRule,
  createPermanentLoanTypeRule,
} = ItemsRules;

// Profile factory functions
const createMainProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C740244_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    entityType: 'ITEM',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.findAndRemove('admin')),
      createSuppressFromDiscoveryRule(true),
      createItemNoteRule(
        ActionCreators.markAsStaffOnly(),
        null, // Will be set to Action note type ID
      ),
      createCheckInNoteRule(
        ActionCreators.changeType(null), // Will be set to Note type ID
        null,
        false,
      ),
      createCheckOutNoteRule(ActionCreators.removeMarkAsStaffOnly(), false),
      createPermanentLoanTypeRule(
        ActionCreators.replaceWith(null), // Will be set to loan type ID
      ),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test profile for executing bulk edit job',
    entityType: 'ITEM',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('admin'))],
  });
};

let user;
let bulkEditJobId;
let queryFileNames;
const testData = {
  folioInstanceTitle: `AT_C740244_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
  profileIds: [],
  actionNote: 'Action note not marked as staff only',
  checkInNote: 'Check in note text',
  checkOutNote: 'Check out note text',
  permanentLoanType: 'Reading room',
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

        cy.getAdminUserDetails().then((record) => {
          testData.adminSourceRecord = record;
        });

        InventoryInstances.getItemNoteTypes({ query: 'name="Action note"' }).then((noteTypes) => {
          InventoryInstances.getItemNoteTypes({ query: 'name=="Note"' }).then(
            (generalNoteTypes) => {
              cy.getLoanTypes({ query: `name="${testData.permanentLoanType}"` }).then(
                (loanTypes) => {
                  // Create main profile with factory
                  const mainProfile = createMainProfileBody();

                  // Set dynamic IDs for main profile
                  mainProfile.ruleDetails[2].actions[0].parameters[0].value = noteTypes[0].id;
                  mainProfile.ruleDetails[3].actions[0].updated = generalNoteTypes[0].id;
                  mainProfile.ruleDetails[5].actions[0].updated = loanTypes[0].id;

                  // Create bulk edit profile
                  cy.createBulkEditProfile(mainProfile).then((profile) => {
                    testData.profileName = profile.name;
                    testData.profileDescription = profile.description;
                    testData.profileIds.push(profile.id);
                  });

                  // Create second bulk edit profile to verify search and sorting
                  const secondProfile = createSecondProfileBody();
                  cy.createBulkEditProfile(secondProfile).then((profile) => {
                    testData.secondProfileName = profile.name;
                    testData.profileIds.push(profile.id);
                  });

                  testData.instanceId = InventoryInstances.createInstanceViaApi(
                    testData.folioInstanceTitle,
                    testData.itemBarcode,
                  );

                  cy.getItems({
                    limit: 1,
                    expandAll: true,
                    query: `"barcode"=="${testData.itemBarcode}"`,
                  }).then((item) => {
                    testData.itemId = item.id;
                    item.administrativeNotes = ['admin note for testing'];
                    item.discoverySuppress = true;
                    item.notes = [
                      {
                        itemNoteTypeId: noteTypes[0].id,
                        note: testData.actionNote,
                        staffOnly: false,
                      },
                    ];
                    item.circulationNotes = [
                      {
                        noteType: 'Check in',
                        note: testData.checkInNote,
                        staffOnly: false,
                      },
                      {
                        noteType: 'Check out',
                        note: testData.checkOutNote,
                        staffOnly: true,
                      },
                    ];

                    cy.updateItemViaApi(item);
                  });
                },
              );
            },
          );
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.clickBuildQueryButton();
        QueryModal.verify();
        QueryModal.selectField(itemFieldValues.itemDiscoverySuppress);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
        QueryModal.chooseValueSelect('True');
        QueryModal.addNewRow();
        QueryModal.selectField(itemFieldValues.itemBarcode, 1);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
        QueryModal.fillInValueTextfield(testData.itemBarcode, 1);
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

      testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);
    });

    // Trillium
    it.skip(
      'C740244 Executing bulk edit job using Items bulk edit profile (Query, Logs) (firebird)',
      { tags: [] },
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
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfilesSortedByName();
        SelectBulkEditProfileModal.changeSortOrderByName();
        SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
        SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
        SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
        SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
        SelectBulkEditProfileModal.searchProfile('at_C740244');
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
        SelectBulkEditProfileModal.searchProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyProfileInTable(
          testData.profileName,
          testData.profileDescription,
          testData.adminSourceRecord,
        );
        SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);

        // Step 6: Click on the row with items bulk edit profile from Preconditions
        SelectBulkEditProfileModal.selectProfile(testData.profileName);
        SelectBulkEditProfileModal.verifyModalClosed('items');
        BulkEditActions.verifyAreYouSureForm(1);

        const editedHeaderValues = [
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            value: 'Action note not marked as staff only (staff only)',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            value: '',
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            value: testData.checkOutNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.NOTE,
            value: testData.checkInNote,
          },
          {
            header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
            value: testData.permanentLoanType,
          },
        ];

        BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
          testData.itemBarcode,
          editedHeaderValues,
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          ' note for testing',
        );
        BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

        // Step 7: Click the "Download preview in CSV format" button
        BulkEditActions.downloadPreview();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          'note for testing',
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
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          'false',
        );
        BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          ' note for testing',
        );

        // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
        BulkEditActions.openActions();
        BulkEditActions.downloadChangedCSV();
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          editedHeaderValues,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          'note for testing',
        );

        // remove earlier dowloaded files
        BulkEditFiles.deleteAllDownloadedFiles(queryFileNames);

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
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          true,
        );

        // Step 14: Click on the "File with the preview of proposed changes (CSV)" hyperlink
        BulkEditLogs.downloadFileWithProposedChanges();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          editedHeaderValues,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.previewFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          'note for testing',
        );

        // Step 15: Click on the "File with updated records (CSV)" hyperlink
        BulkEditLogs.downloadFileWithUpdatedRecords();
        BulkEditFiles.verifyHeaderValueInRowByIdentifier(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          editedHeaderValues,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
          false,
        );
        BulkEditFiles.verifyValueInRowByUUID(
          queryFileNames.changedRecordsFileName,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          testData.itemBarcode,
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
          'note for testing',
        );

        // Step 16: Navigate to the "Inventory" app => Search for the recently edited Items => Verify that made changes have been applied
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByParameter('Barcode', testData.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote('');
        ItemRecordView.suppressedAsDiscoveryIsAbsent();
        ItemRecordView.checkMultipleItemNotesWithStaffOnly(
          0,
          'Yes',
          'Action note',
          testData.actionNote,
        );
        ItemRecordView.checkMultipleItemNotesWithStaffOnly(1, 'No', 'Note', testData.checkInNote);
        ItemRecordView.checkCheckOutNote(testData.checkOutNote, 'No');
        ItemRecordView.verifyPermanentLoanType(testData.permanentLoanType);
      },
    );
  });
});
