import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createTemporaryLocationRule,
  ItemsRules,
  ActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const { createItemNoteRule, createStatusRule, createTemporaryLoanTypeRule, createCheckInNoteRule } =
  ItemsRules;

// Profile factory functions
const createMainProfileBody = () => {
  return createBulkEditProfileBody({
    name: `AT_C770421_ItemsProfile_${getRandomPostfix()}`,
    description: 'Test items bulk edit profile for executing bulk edit job in central tenant',
    entityType: 'ITEM',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.findAndReplace('admin', 'Administrative')),
      createItemNoteRule(
        ActionCreators.addToExisting('ADDED Electronic bookplate note'),
        null, // Will be set to Electronic bookplate note type ID
        false,
      ),
      createItemNoteRule(
        ActionCreators.removeAll(),
        null, // Will be set to Action note type ID
      ),
      createCheckInNoteRule(ActionCreators.markAsStaffOnly(false)),
      createStatusRule(ActionCreators.replaceWith(ITEM_STATUS_NAMES.IN_PROCESS)),
      createTemporaryLoanTypeRule(ActionCreators.clearField()),
      createTemporaryLocationRule(ActionCreators.clearField()),
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
  permissionsSet: [
    permissions.bulkEditEdit.gui,
    permissions.uiInventoryViewCreateEditItems.gui,
    permissions.bulkEditQueryView.gui,
  ],
  folioInstance: {
    title: `AT_C770421_FolioInstance_${getRandomPostfix()}`,
    barcodeInCollege: `Item_College_${getRandomPostfix()}`,
    itemIds: [],
    holdingIds: [],
  },
  profileIds: [],
  actionNote: 'Action note not marked as staff only',
  checkInNote: 'Check in note text',
  electronicBookplateNote: 'ADDED Electronic bookplate note',
  editedAdministrativeNote: 'Administrative note for testing',
  permanentLoanType: 'Reading room',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(testData.permissionsSet).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, testData.permissionsSet);
          cy.resetTenant();
          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });
          InventoryInstances.getItemNoteTypes({ query: 'name="Action note"' }).then((noteTypes) => {
            testData.actionNoteTypeId = noteTypes[0].id;

            InventoryInstances.getItemNoteTypes({ query: 'name="Electronic bookplate"' }).then(
              (electronicBookplateNoteTypes) => {
                testData.electronicBookplateNoteTypeId = electronicBookplateNoteTypes[0].id;

                // Create profiles using factory functions
                const mainProfile = createMainProfileBody();
                mainProfile.ruleDetails[1].actions[0].parameters[0].value =
                  testData.electronicBookplateNoteTypeId;
                mainProfile.ruleDetails[2].actions[0].parameters[0].value =
                  testData.actionNoteTypeId;

                // Store profile descriptions for test assertions
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
              },
            );
            cy.getInstanceTypes({ limit: 1 })
              .then((instanceTypeData) => {
                testData.instanceTypeId = instanceTypeData[0].id;

                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: testData.instanceTypeId,
                    title: testData.folioInstance.title,
                  },
                }).then((createdInstanceData) => {
                  testData.folioInstance.uuid = createdInstanceData.instanceId;
                });
              })
              .then(() => {
                cy.setTenant(Affiliations.College);
                cy.getMaterialTypes({ limit: 1 }).then((res) => {
                  testData.materialTypeId = res.id;
                });
                cy.getLocations({ limit: 1 }).then((res) => {
                  testData.locationId = res.id;
                  testData.locationName = res.name;
                });
                cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                  (res) => {
                    testData.loanTypeId = res[0].id;
                  },
                );
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  testData.sourceId = folioSource.id;
                });
              })
              .then(() => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.folioInstance.uuid,
                  permanentLocationId: testData.locationId,
                  sourceId: testData.sourceId,
                }).then((holding) => {
                  testData.folioInstance.holdingIds.push(holding.id);
                  cy.wait(1000);

                  InventoryItems.createItemViaApi({
                    barcode: testData.folioInstance.barcodeInCollege,
                    holdingsRecordId: holding.id,
                    materialType: { id: testData.materialTypeId },
                    permanentLoanType: { id: testData.loanTypeId },
                    temporaryLoanType: { id: testData.loanTypeId },
                    temporaryLocation: { id: testData.locationId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    administrativeNotes: ['admin note for testing'],
                    notes: [
                      {
                        itemNoteTypeId: testData.actionNoteTypeId,
                        note: testData.actionNote,
                        staffOnly: false,
                      },
                    ],
                    circulationNotes: [
                      {
                        noteType: 'Check in',
                        note: testData.checkInNote,
                        staffOnly: false,
                      },
                    ],
                  }).then((item) => {
                    testData.folioInstance.itemIds.push(item.id);
                  });
                });
              })
              .then(() => {
                cy.resetTenant();
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.bulkEditPath,
                  waiter: BulkEditSearchPane.waitLoading,
                });
                BulkEditSearchPane.openQuerySearch();
                BulkEditSearchPane.checkItemsRadio();
                BulkEditSearchPane.clickBuildQueryButton();
                QueryModal.verify();
                QueryModal.selectField(itemFieldValues.temporaryLocation);
                QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
                QueryModal.chooseValueSelect(testData.locationName);
                QueryModal.addNewRow();
                QueryModal.selectField(itemFieldValues.instanceId, 1);
                QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
                QueryModal.fillInValueTextfield(testData.folioInstance.uuid, 1);
                cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
                QueryModal.clickTestQuery();
                QueryModal.verifyPreviewOfRecordsMatched();
                QueryModal.clickRunQuery();
                QueryModal.verifyClosed();
                cy.wait('@getPreview', getLongDelay()).then((interception) => {
                  const interceptedUuid = interception.request.url.match(
                    /bulk-operations\/([a-f0-9-]+)\/preview/,
                  )[1];
                  testData.bulkEditJobId = interceptedUuid;
                  testData.queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
                    testData.bulkEditJobId,
                    true,
                  );
                });
              });
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

        cy.setTenant(Affiliations.College);
        cy.deleteItemViaApi(testData.folioInstance.itemIds[0]);
        cy.deleteHoldingRecordViaApi(testData.folioInstance.holdingIds[0]);

        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
        BulkEditFiles.deleteAllDownloadedFiles(testData.queryFileNames);
      });

      // Trillium
      it.skip(
        'C770421 ECS | Executing bulk edit job using Items bulk edit profile in Central tenant (Query) (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
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
          SelectBulkEditProfileModal.searchProfile('at_C770421');
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
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              value: testData.editedAdministrativeNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_BOOKPLATE_NOTE,
              value: testData.electronicBookplateNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              value: `${testData.checkInNote} (staff only)`,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
              value: ITEM_STATUS_NAMES.IN_PROCESS,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.TEMPORARY_LOAN_TYPE,
              value: '',
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_TEMPORARY_LOCATION,
              value: '',
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.folioInstance.barcodeInCollege,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            testData.queryFileNames.previewFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInCollege,
            editedHeaderValues,
          );

          // Step 8: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.folioInstance.barcodeInCollege,
            editedHeaderValues,
          );

          // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            testData.queryFileNames.changedRecordsFileName,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            testData.folioInstance.barcodeInCollege,
            editedHeaderValues,
          );

          // Step 10: Switch affiliation to member tenant, Navigate to "Inventory" app
          // Search for the recently edited Items, Verify that made changes have been applied
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.byKeywords(testData.folioInstance.title);
          InventoryInstance.openHoldings(['']);
          InventoryInstance.openItemByBarcode(testData.folioInstance.barcodeInCollege);
          ItemRecordView.waitLoading();
          ItemRecordView.checkItemAdministrativeNote(testData.editedAdministrativeNote);
          ItemRecordView.checkMultipleItemNotesWithStaffOnly(
            0,
            'No',
            'Electronic bookplate',
            testData.electronicBookplateNote,
          );
          ItemRecordView.checkCheckInNote(testData.checkInNote, 'Yes');
          ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
          ItemRecordView.verifyTemporaryLoanType('No value set-');
          ItemRecordView.verifyTemporaryLocation('No value set-');
        },
      );
    });
  });
});
