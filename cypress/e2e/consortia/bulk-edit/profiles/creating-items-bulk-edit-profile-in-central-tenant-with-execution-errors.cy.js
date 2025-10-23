import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  getReasonForTenantNotAssociatedError,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ItemNoteTypes from '../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import LoanTypes from '../../../../support/fragments/settings/inventory/items/loanTypes';
import ItemsBulkEditProfilesPane from '../../../../support/fragments/settings/bulk-edit/profilePane/itemsBulkEditProfilesPane';
import ItemsBulkEditProfileForm from '../../../../support/fragments/settings/bulk-edit/profileForm/itemsBulkEditProfileForm';
import BulkEditPane from '../../../../support/fragments/settings/bulk-edit/bulkEditPane';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import SelectLocationsModal from '../../../../support/fragments/bulk-edit/select-consortia-location-modal';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_ACTIONS,
  LOCATION_NAMES,
  LOAN_TYPE_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let memberLocationData;
let materialTypeId;
let sourceId;
let actionNoteTypeId;
let defaultLoanTypeId;
let localItemNoteTypeData;
let localLoanTypeData;
let itemId;
const folioInstance = {
  title: `AT_C825312_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode${randomFourDigitNumber()}`,
};
const localItemNoteType = {
  name: `AT_C825312 local item note type ${getRandomPostfix()}`,
};
const localLoanType = {
  name: `AT_C825312 local loan type ${getRandomPostfix()}`,
};
const profileName = `AT_C825312 Items profile with values from central tenant ${getRandomPostfix()}`;
const noteText = 'Original shared note content';
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
  permissions.bulkEditSettingsCreate.gui,
];

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        InventoryInstances.getItemNoteTypes({ query: 'name="Action note"' }).then((noteTypes) => {
          actionNoteTypeId = noteTypes[0].id;
        });
        cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
          defaultLoanTypeId = res[0].id;
        });
        ItemNoteTypes.createItemNoteTypeViaApi(localItemNoteType.name).then((noteTypeId) => {
          localItemNoteTypeData = { id: noteTypeId, name: localItemNoteType.name };
        });
        LoanTypes.createLoanTypesViaApi({
          name: localLoanType.name,
          source: 'local',
        }).then((loanTypeId) => {
          localLoanTypeData = { id: loanTypeId, name: localLoanType.name };

          cy.createTempUser(userPermissions).then((userProperties) => {
            user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, userPermissions);

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            });
            cy.getLocations({ limit: 1 }).then((res) => {
              memberLocationData = res;
            });
            cy.getDefaultMaterialType().then((res) => {
              materialTypeId = res.id;
            });
            InventoryHoldings.getHoldingsFolioSource()
              .then((folioSource) => {
                sourceId = folioSource.id;
              })
              .then(() => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                  holdings: [
                    {
                      permanentLocationId: memberLocationData.id,
                      sourceId,
                    },
                  ],
                  items: [
                    {
                      barcode: folioInstance.itemBarcode,
                      permanentLocation: { id: memberLocationData.id },
                      permanentLoanType: { id: defaultLoanTypeId },
                      materialType: { id: materialTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      notes: [
                        {
                          itemNoteTypeId: actionNoteTypeId,
                          note: noteText,
                          staffOnly: false,
                        },
                      ],
                    },
                  ],
                }).then((instanceData) => {
                  folioInstance.id = instanceData.instanceId;
                  itemId = instanceData.items[0].id;

                  FileManager.createFile(`cypress/fixtures/${itemUUIDsFileName}`, itemId);
                });
              });

            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.settingsPath,
              waiter: SettingsPane.waitLoading,
            });
          });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ItemsBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(profileName);
        Users.deleteViaApi(user.userId);
        ItemNoteTypes.deleteItemNoteTypeViaApi(localItemNoteTypeData.id);
        LoanTypes.deleteLoanTypesViaApi(localLoanTypeData.id);
        cy.withinTenant(Affiliations.College, () => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
        });
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      // Trillium
      it.skip(
        'C825312 Create Items bulk edit profile in Central tenant and use it to execute bulk edit job with errors (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Navigate to Items bulk edit profiles and create new profile
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
          BulkEditPane.waitLoading();
          BulkEditPane.clickItemsBulkEditProfiles();
          ItemsBulkEditProfilesPane.waitLoading();
          ItemsBulkEditProfilesPane.verifyPaneElements();
          ItemsBulkEditProfilesPane.clickNewButton();
          ItemsBulkEditProfileForm.waitLoading();
          ItemsBulkEditProfileForm.verifyFormElements('New items bulk edit profile');

          // Step 2: Verify only shared note types are displayed
          ItemsBulkEditProfileForm.selectOption('Item notes');
          ItemsBulkEditProfileForm.clickSelectOptionDropdown();
          ItemsBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
          );
          ItemsBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
            localItemNoteType.name,
            0,
            false,
          );

          // Step 3: Select shared note type and verify Change note type action
          ItemsBulkEditProfileForm.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
          );
          ItemsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE);
          ItemsBulkEditProfileForm.verifyNoteTypeExistsInSelectOptionDropdown(
            localItemNoteType.name,
            0,
            false,
          );

          // Step 4: Select shared note type option
          ItemsBulkEditProfileForm.selectNoteTypeWhenChangingIt('Binding');
          ItemsBulkEditProfileForm.verifySaveButtonDisabled(true);

          // Step 5: Add permanent loan type row and verify only shared types are available
          ItemsBulkEditProfileForm.clickPlusButton();
          ItemsBulkEditProfileForm.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
            1,
          );
          ItemsBulkEditProfileForm.expandSelectLoanTypeDropdown();
          ItemsBulkEditProfileForm.verifyLoanTypeExistsInSelectOptionDropdown(
            LOAN_TYPE_NAMES.CAN_CIRCULATE,
            true,
          );
          ItemsBulkEditProfileForm.verifyLoanTypeExistsInSelectOptionDropdown(
            localLoanType.name,
            false,
          );

          // Step 6: Select shared loan type option
          ItemsBulkEditProfileForm.selectLoanTypeWhenChangingIt(LOAN_TYPE_NAMES.SELECTED, 1);
          ItemsBulkEditProfileForm.verifySaveButtonDisabled(true);

          // Step 7: Add permanent item location and verify only central tenant locations
          ItemsBulkEditProfileForm.clickPlusButton(1);
          ItemsBulkEditProfileForm.selectOption('Permanent item location', 2);
          ItemsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 2);
          ItemsBulkEditProfileForm.clickLocationLookup(2);
          SelectLocationsModal.verifyTenantsInAffiliationDropdown(
            `${tenantNames.central} (Primary)`,
          );

          // Step 8: Select location from central tenant
          SelectLocationsModal.selectLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
          SelectLocationsModal.verifySelectLocationModalExists(false);
          ItemsBulkEditProfileForm.verifySaveButtonDisabled(true);

          // Step 9: Fill profile name and save
          ItemsBulkEditProfileForm.fillProfileName(profileName);
          ItemsBulkEditProfileForm.verifySaveButtonDisabled(false);
          ItemsBulkEditProfileForm.clickSaveAndClose();
          ItemsBulkEditProfilesPane.verifySuccessToast('created');
          ItemsBulkEditProfilesPane.waitLoading();
          ItemsBulkEditProfilesPane.verifyProfileInTable(profileName, 'No value set-', user);

          // Step 10: Navigate to Bulk edit app and upload file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.itemBarcode,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            folioInstance.itemBarcode,
          );

          // Step 11: Select bulk edit profile
          BulkEditActions.openActions();
          BulkEditActions.clickSelectBulkEditProfile('items');
          SelectBulkEditProfileModal.waitLoading('items');
          SelectBulkEditProfileModal.selectProfile(profileName);
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
              value: noteText,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
              value: LOAN_TYPE_NAMES.SELECTED,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: LOCATION_NAMES.MAIN_LIBRARY_UI,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            folioInstance.itemBarcode,
            editedHeaderValues,
          );

          // Step 12: Download preview
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            folioInstance.itemBarcode,
            editedHeaderValues,
          );

          // Step 13: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyErrorLabel(1);

          const changedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BINDING_NOTE,
              value: noteText,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
              value: LOAN_TYPE_NAMES.SELECTED,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_PERMANENT_LOCATION,
              value: memberLocationData.name,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            folioInstance.itemBarcode,
            changedHeaderValues,
          );

          const errorMessage = getReasonForTenantNotAssociatedError(
            itemId,
            Affiliations.College,
            'permanent location',
          );

          BulkEditSearchPane.verifyError(itemId, errorMessage);

          // Step 14: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            folioInstance.itemBarcode,
            changedHeaderValues,
          );

          // Step 15: Download errors
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${itemId},${errorMessage}`,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 1);

          // Step 16: Verify changes in member tenant Inventory
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', folioInstance.itemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.checkItemNote(noteText, 'No', 'Binding');
          ItemRecordView.verifyPermanentLoanType(LOAN_TYPE_NAMES.SELECTED);
          ItemRecordView.verifyPermanentLocation(memberLocationData.name);
        },
      );
    });
  });
});
