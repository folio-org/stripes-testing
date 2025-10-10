import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import FileManager from '../../../../support/utils/fileManager';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createSuppressFromDiscoveryRule,
  ItemsRules,
  ActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

const {
  createItemNoteRule,
  createCheckInNoteRule,
  createCheckOutNoteRule,
  createPermanentLocationRule,
} = ItemsRules;

// Profile factory functions
const createMainProfileBody = (copyNoteTypeId, actionNoteTypeId, newLocationId) => {
  return createBulkEditProfileBody({
    name: `AT_C770423_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test items bulk edit profile for executing bulk edit job in member tenant',
    entityType: 'ITEM',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.changeType(copyNoteTypeId)),
      createSuppressFromDiscoveryRule(false),
      createItemNoteRule(ActionCreators.removeMarkAsStaffOnly(), actionNoteTypeId),
      createCheckInNoteRule(ActionCreators.findAndReplace('check in', 'CHECK IN')),
      createCheckOutNoteRule(ActionCreators.findAndRemove('check out')),
      createPermanentLocationRule(ActionCreators.replaceWith(newLocationId)),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test profile for testing search and sort functionality',
    entityType: 'ITEM',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('test'))],
  });
};
const testData = {
  folioInstance: {
    title: `AT_C770423_FolioInstance_${getRandomPostfix()}`,
    barcodeInMember: `Item_Member_${getRandomPostfix()}`,
    itemIds: [],
    holdingIds: [],
  },
  profileIds: [],
  administrativeNote: 'admin note for testing',
  actionNote: 'Action note marked as staff only',
  checkInNote: 'check in note for testing',
  checkOutNote: 'check out',
  editedCheckInNote: 'CHECK IN note for testing',
};
const itemUUIDsFileName = `itemUUIDs_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });

          InventoryInstances.getItemNoteTypes({ query: 'name="Action note"' }).then((noteTypes) => {
            testData.actionNoteTypeId = noteTypes[0].id;

            InventoryInstances.getItemNoteTypes({ query: 'name="Copy note"' }).then(
              (copyNoteTypes) => {
                testData.copyNoteTypeId = copyNoteTypes[0].id;

                cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                  testData.instanceTypeId = instanceTypeData[0].id;
                });
                cy.getMaterialTypes({ limit: 1 }).then((res) => {
                  testData.materialTypeId = res.id;
                });
                InventoryInstances.getLocations({ limit: 2 }).then((res) => {
                  testData.locationId = res[0].id;
                  testData.locationName = res[0].name;
                  testData.newLocationId = res[1].id;
                  testData.newLocationName = res[1].name;
                });
                cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` })
                  .then((res) => {
                    testData.loanTypeId = res[0].id;
                  })
                  .then(() => {
                    // Create instance with holdings and items in one call
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: testData.instanceTypeId,
                        title: testData.folioInstance.title,
                      },
                      holdings: [
                        {
                          permanentLocationId: testData.locationId,
                        },
                      ],
                      items: [
                        {
                          barcode: testData.folioInstance.barcodeInMember,
                          materialType: { id: testData.materialTypeId },
                          permanentLoanType: { id: testData.loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          administrativeNotes: [testData.administrativeNote],
                          discoverySuppress: false,
                          notes: [
                            {
                              itemNoteTypeId: testData.actionNoteTypeId,
                              note: testData.actionNote,
                              staffOnly: true,
                            },
                          ],
                          circulationNotes: [
                            {
                              noteType: 'Check in',
                              note: testData.checkInNote,
                              staffOnly: false,
                            },
                            {
                              noteType: 'Check out',
                              note: testData.checkOutNote,
                              staffOnly: false,
                            },
                          ],
                        },
                      ],
                    }).then((createdInstanceData) => {
                      testData.folioInstance.uuid = createdInstanceData.instanceId;
                      testData.folioInstance.holdingIds = createdInstanceData.holdingIds.map(
                        (holding) => holding.id,
                      );
                      testData.folioInstance.itemIds = createdInstanceData.items.map(
                        (item) => item.id,
                      );
                      testData.itemUUID = createdInstanceData.items[0].id;

                      // Create CSV file with item UUID
                      FileManager.createFile(
                        `cypress/fixtures/${itemUUIDsFileName}`,
                        testData.itemUUID,
                      );
                    });

                    // Create profiles using factory functions
                    const mainProfile = createMainProfileBody(
                      testData.copyNoteTypeId,
                      testData.actionNoteTypeId,
                      testData.newLocationId,
                    );
                    testData.profileDescription = mainProfile.description;

                    const secondProfile = createSecondProfileBody();
                    testData.secondProfileDescription = secondProfile.description;

                    cy.createBulkEditProfile(mainProfile).then((profile) => {
                      testData.profileName = profile.name;
                      testData.profileIds.push(profile.id);
                    });

                    cy.createBulkEditProfile(secondProfile).then((profile) => {
                      testData.secondProfileName = profile.name;
                      testData.profileIds.push(profile.id);
                    });
                  });
              },
            );
          });
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.College);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.folioInstance.uuid);
        FileManager.deleteFile(`cypress/downloads/${itemUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C770423 ECS | Executing bulk edit job using Items bulk edit profile in Member tenant (Logs) (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C770423'] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
          );

          // Step 3: Click "Select items bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('items');
          SelectBulkEditProfileModal.waitLoading('items');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 4-5: Verify the table with the list of existing items bulk edit profiles
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfilesFoundText();
          SelectBulkEditProfileModal.verifyProfileNumberMatchesNumberInSettings('items');
          SelectBulkEditProfileModal.verifyProfilesSortedByName();
          SelectBulkEditProfileModal.changeSortOrderByName();
          SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
          SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
          SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
          SelectBulkEditProfileModal.searchProfile('at_C770423');
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
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.COPY_NOTE,
              value: testData.administrativeNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
              value: testData.actionNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              value: testData.editedCheckInNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: testData.newLocationName,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.folioInstance.barcodeInMember,
            editedHeaderValues,
          );

          // Verify SUPPRESS_FROM_DISCOVERY separately (UI shows 'true' as string)
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            testData.folioInstance.barcodeInMember,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            'true',
          );

          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            editedHeaderValues,
          );

          // Verify SUPPRESS_FROM_DISCOVERY separately in CSV (file contains boolean true)
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            true,
          );

          // Step 8: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.folioInstance.barcodeInMember,
            editedHeaderValues,
          );

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            testData.folioInstance.barcodeInMember,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            'true',
          );

          // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            true,
          );

          // remove earlier downloaded files
          FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
          BulkEditFiles.deleteAllDownloadedFiles(fileNames);

          // Step 10: Click "Logs" toggle in "Set criteria" pane
          // Check "Inventory - items" checkbox under "Record types" accordion
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.checkItemsCheckbox();
          BulkEditLogs.clickActionsRunBy(testData.user.username);

          // Step 11: Click on the "..." action element in the row with recently completed bulk edit job
          BulkEditLogs.verifyLogsRowActionWhenCompleted();

          // Step 12: Click on the "File that was used to trigger the bulk edit"
          BulkEditLogs.downloadFileUsedToTrigger();
          ExportFile.verifyFileIncludes(itemUUIDsFileName, [testData.itemUUID]);

          // Step 13: Click on the "File with the matching records" hyperlink
          BulkEditLogs.downloadFileWithMatchingRecords();
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            testData.itemUUID,
          );

          // Step 14: Click on the "File with the preview of proposed changes (CSV)" hyperlink
          BulkEditLogs.downloadFileWithProposedChanges();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            true,
          );

          // Step 15: Click on the "File with updated records (CSV)" hyperlink
          BulkEditLogs.downloadFileWithUpdatedRecords();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            editedHeaderValues,
          );

          // Verify SUPPRESS_FROM_DISCOVERY separately in updated records CSV
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInMember,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.SUPPRESS_FROM_DISCOVERY,
            true,
          );

          // Step 16: Navigate to the "Inventory" app, Search for the recently edited Items
          // Verify that made changes have been applied
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.byKeywords(testData.folioInstance.title);
          InventoryInstance.openHoldings(['']);
          InventoryInstance.openItemByBarcode(testData.folioInstance.barcodeInMember);
          ItemRecordView.waitLoading();
          ItemRecordView.checkMultipleItemNotesWithStaffOnly(
            1,
            'No',
            'Copy note',
            testData.administrativeNote,
          );
          ItemRecordView.suppressedAsDiscoveryIsPresent();
          ItemRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            'Action note',
            testData.actionNote,
          );
          ItemRecordView.checkCheckInNote(testData.editedCheckInNote, 'No');
          ItemRecordView.checkCheckOutNote('No value set-', 'No');
          ItemRecordView.verifyPermanentLocation(testData.newLocationName);
        },
      );
    });
  });
});
