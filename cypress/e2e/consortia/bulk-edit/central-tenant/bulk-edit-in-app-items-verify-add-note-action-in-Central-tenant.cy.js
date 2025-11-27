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
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemNoteTypes from '../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ItemNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let centralSharedNoteTypeData;
let folioInstance;
let marcInstance;
let centralSharedItemNoteType;
let localItemNoteType;
let localItemNoteTypeNameWithAffiliation;
let instances;
let itemUUIDsFileName;
let matchedRecordsFileName;
let previewFileName;
let changedRecordsFileName;
let errorsFromCommittingFileName;
const administrativeNoteText = "Administrative note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,";
const sharedNoteText = 'New shared note';
const localNoteText = 'New local note';
const checkInNoteText = "Check in note ~,!,@,#,$,%,^,&,*,(,),~,', {.[,]<},>,ø, Æ, §,";
const checkOutNoteText = 'Check out note staff only';

describe(
  'Bulk-edit',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Central tenant', () => {
      describe('Consortia', () => {
        beforeEach('create test data', () => {
          folioInstance = {
            title: `C477648 folio instance testBulkEdit_${getRandomPostfix()}`,
            barcodeInCollege: `Item_College${getRandomPostfix()}`,
            barcodeInUniversity: `Item_University${getRandomPostfix()}`,
            itemIds: [],
            holdingIds: [],
          };
          marcInstance = {
            title: `C477648 marc instance testBulkEdit_${getRandomPostfix()}`,
            barcodeInCollege: `Item_College${getRandomPostfix()}`,
            barcodeInUniversity: `Item_University${getRandomPostfix()}`,
            itemIds: [],
            holdingIds: [],
          };
          centralSharedItemNoteType = {
            payload: {
              name: `C477648 shared note type ${randomFourDigitNumber()}`,
            },
          };
          localItemNoteType = {
            name: `College NoteType ${randomFourDigitNumber()}`,
          };
          localItemNoteTypeNameWithAffiliation = `${localItemNoteType.name} (${Affiliations.College})`;
          instances = [folioInstance, marcInstance];
          itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
          matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName, true);
          previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName, true);
          changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName, true);
          errorsFromCommittingFileName = BulkEditFiles.getErrorsFromCommittingFileName(
            itemUUIDsFileName,
            true,
          );

          cy.clearLocalStorage();
          cy.getAdminToken();
          cy.createTempUser([
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]).then((userProperties) => {
            user = userProperties;

            [Affiliations.College, Affiliations.University].forEach((affiliation) => {
              cy.assignAffiliationToUser(affiliation, user.userId);
              cy.setTenant(affiliation);
              cy.assignPermissionsToExistingUser(user.userId, [
                permissions.bulkEditEdit.gui,
                permissions.uiInventoryViewCreateEditItems.gui,
              ]);
              cy.resetTenant();
            });

            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            });
            cy.getLocations({ query: 'name="DCB"' }).then((res) => {
              locationId = res.id;
            });
            cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
              loanTypeId = res[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              sourceId = folioSource.id;
            });
            ItemNoteTypesConsortiumManager.createViaApi(centralSharedItemNoteType).then(
              (newItemNoteType) => {
                centralSharedNoteTypeData = newItemNoteType;
              },
            );

            cy.setTenant(Affiliations.College);
            // create local item note type in College
            ItemNoteTypes.createItemNoteTypeViaApi(localItemNoteType.name)
              .then((noteId) => {
                localItemNoteType.id = noteId;
              })
              .then(() => {
                cy.resetTenant();
                // create shared folio instance
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                }).then((createdInstanceData) => {
                  folioInstance.uuid = createdInstanceData.instanceId;
                });
              })
              .then(() => {
                // create shared marc instance
                cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                  marcInstance.uuid = instanceId;
                });
              })
              .then(() => {
                // create holdings in College tenant
                cy.setTenant(Affiliations.College);
                cy.getMaterialTypes({ limit: 1 }).then((res) => {
                  materialTypeId = res.id;
                });

                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.uuid,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIds.push(holding.id);
                  });
                  cy.wait(1000);
                });
              })
              .then(() => {
                // create items in College tenant
                instances.forEach((instance) => {
                  InventoryItems.createItemViaApi({
                    barcode: instance.barcodeInCollege,
                    holdingsRecordId: instance.holdingIds[0],
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    instance.itemIds.push(item.id);
                  });
                  cy.wait(1000);
                });
              })
              .then(() => {
                // create holdings in University tenant
                cy.setTenant(Affiliations.University);
                cy.getMaterialTypes({ limit: 1 }).then((res) => {
                  materialTypeId = res.id;
                });

                instances.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.uuid,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    instance.holdingIds.push(holding.id);
                  });
                  cy.wait(1000);
                });
              })
              .then(() => {
                // create items in University tenant
                instances.forEach((instance) => {
                  InventoryItems.createItemViaApi({
                    barcode: instance.barcodeInUniversity,
                    holdingsRecordId: instance.holdingIds[1],
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  }).then((item) => {
                    instance.itemIds.push(item.id);
                  });
                  cy.wait(1000);
                });
              })
              .then(() => {
                FileManager.createFile(
                  `cypress/fixtures/${itemUUIDsFileName}`,
                  `${folioInstance.itemIds.join('\n')}\n${marcInstance.itemIds.join('\n')}`,
                );
              });

            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        afterEach('delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          ItemNoteTypes.deleteItemNoteTypeViaApi(localItemNoteType.id);

          instances.forEach((instance) => {
            cy.deleteItemViaApi(instance.itemIds[0]);
            cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
          });

          cy.setTenant(Affiliations.University);

          instances.forEach((instance) => {
            cy.deleteItemViaApi(instance.itemIds[1]);
            cy.deleteHoldingRecordViaApi(instance.holdingIds[1]);
          });

          cy.resetTenant();
          cy.getAdminToken();

          instances.forEach((instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.uuid);
          });

          ItemNoteTypesConsortiumManager.deleteViaApi(centralSharedNoteTypeData);
          Users.deleteViaApi(user.userId);
          FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
          FileManager.deleteFileFromDownloadsByMask(
            matchedRecordsFileName,
            previewFileName,
            changedRecordsFileName,
            errorsFromCommittingFileName,
          );
        });

        it(
          'C477648 Verify "Add note" action for Items in Central tenant (consortia) (firebird)',
          { tags: ['smokeECS', 'firebird', 'C477648'] },
          () => {
            BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
            BulkEditSearchPane.uploadFile(itemUUIDsFileName);
            BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
            BulkEditSearchPane.verifyPaneRecordsCount('4 item');
            BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);

            const itemBarcodes = [
              folioInstance.barcodeInCollege,
              folioInstance.barcodeInUniversity,
              marcInstance.barcodeInCollege,
              marcInstance.barcodeInUniversity,
            ];

            itemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.AVAILABLE,
              );
            });
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(4);
            BulkEditActions.openActions();
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              false,
              centralSharedItemNoteType.payload.name,
              localItemNoteTypeNameWithAffiliation,
            );
            BulkEditSearchPane.changeShowColumnCheckbox(
              centralSharedItemNoteType.payload.name,
              localItemNoteTypeNameWithAffiliation,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
            );
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              true,
              centralSharedItemNoteType.payload.name,
              localItemNoteTypeNameWithAffiliation,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
            );

            const initialHeaderValues = [
              {
                header: centralSharedItemNoteType.payload.name,
                value: '',
              },
              { header: localItemNoteTypeNameWithAffiliation, value: '' },
            ];

            itemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
                barcode,
                initialHeaderValues,
              );
            });
            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.barcodeInCollege,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.college,
              );
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                instance.barcodeInUniversity,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.university,
              );
            });

            BulkEditSearchPane.changeShowColumnCheckbox(
              centralSharedItemNoteType.payload.name,
              localItemNoteTypeNameWithAffiliation,
            );
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              false,
              centralSharedItemNoteType.payload.name,
              localItemNoteTypeNameWithAffiliation,
            );
            BulkEditSearchPane.verifyResultColumnTitlesDoNotIncludeTitles(
              centralSharedItemNoteType.payload.name,
              localItemNoteTypeNameWithAffiliation,
            );
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            itemBarcodes.forEach((barcode) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                matchedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                initialHeaderValues,
              );
            });

            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);
            BulkEditActions.clickOptionsSelection();
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
              centralSharedItemNoteType.payload.name,
            );
            BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
              localItemNoteTypeNameWithAffiliation,
            );
            BulkEditActions.clickOptionsSelection();
            BulkEditActions.addItemNoteAndVerify('Administrative note', administrativeNoteText);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(1);
            BulkEditActions.addItemNoteAndVerify(
              centralSharedItemNoteType.payload.name,
              sharedNoteText,
              1,
            );
            BulkEditActions.verifyStaffOnlyCheckbox(false, 1);
            BulkEditActions.checkStaffOnlyCheckbox(1);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(2);
            BulkEditActions.addItemNoteAndVerify(
              localItemNoteTypeNameWithAffiliation,
              localNoteText,
              2,
            );
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(3);
            BulkEditActions.addItemNoteAndVerify('Check in note', checkInNoteText, 3);
            BulkEditActions.verifyStaffOnlyCheckbox(false, 3);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.addNewBulkEditFilterString();
            BulkEditActions.verifyNewBulkEditRow(4);
            BulkEditActions.addItemNoteAndVerify('Check out note', checkOutNoteText, 4);
            BulkEditActions.verifyStaffOnlyCheckbox(false, 4);
            BulkEditActions.checkStaffOnlyCheckbox(4);
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

            const headerValuesToEdit = [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                value: administrativeNoteText,
              },
              {
                header: centralSharedItemNoteType.payload.name,
                value: `${sharedNoteText} (staff only)`,
              },
              {
                header: localItemNoteTypeNameWithAffiliation,
                value: localNoteText,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
                value: checkInNoteText,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
                value: `${checkOutNoteText} (staff only)`,
              },
            ];

            itemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
                barcode,
                headerValuesToEdit,
              );
            });

            BulkEditActions.verifyAreYouSureForm(4);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.barcodeInCollege,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.college,
              );
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                instance.barcodeInUniversity,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.university,
              );
            });

            BulkEditActions.downloadPreview();

            itemBarcodes.forEach((barcode) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                previewFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                headerValuesToEdit,
              );
            });
            instances.forEach((instance) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                instance.barcodeInCollege,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.college,
              );
              BulkEditFiles.verifyValueInRowByUUID(
                previewFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                instance.barcodeInUniversity,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.university,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(4);

            const editedHeaderValues = [
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                value: administrativeNoteText,
              },
              {
                header: centralSharedItemNoteType.payload.name,
                value: `${sharedNoteText} (staff only)`,
              },

              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
                value: checkInNoteText,
              },
              {
                header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
                value: `${checkOutNoteText} (staff only)`,
              },
            ];

            itemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                barcode,
                editedHeaderValues,
              );
            });
            instances.forEach((instance) => {
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                instance.barcodeInCollege,
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                    value: tenantNames.college,
                  },
                  {
                    header: localItemNoteTypeNameWithAffiliation,
                    value: localNoteText,
                  },
                ],
              );
              BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
                instance.barcodeInUniversity,
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                    value: tenantNames.university,
                  },
                  {
                    header: localItemNoteTypeNameWithAffiliation,
                    value: '',
                  },
                ],
              );
            });

            BulkEditSearchPane.verifyErrorLabel(2);

            instances.forEach((instance) => {
              BulkEditSearchPane.verifyErrorByIdentifier(
                instance.itemIds[1],
                getReasonForTenantNotAssociatedError(
                  instance.itemIds[1],
                  Affiliations.University,
                  'note type',
                ),
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            itemBarcodes.forEach((barcode) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                editedHeaderValues,
              );
            });
            instances.forEach((instance) => {
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                instance.barcodeInCollege,
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                    value: tenantNames.college,
                  },
                  {
                    header: localItemNoteTypeNameWithAffiliation,
                    value: localNoteText,
                  },
                ],
              );
              BulkEditFiles.verifyHeaderValueInRowByIdentifier(
                changedRecordsFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                instance.barcodeInUniversity,
                [
                  {
                    header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                    value: tenantNames.university,
                  },
                  {
                    header: localItemNoteTypeNameWithAffiliation,
                    value: '',
                  },
                ],
              );
            });

            BulkEditActions.downloadErrors();

            instances.forEach((instance) => {
              ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
                `ERROR,${instance.itemIds[1]},${getReasonForTenantNotAssociatedError(instance.itemIds[1], Affiliations.University, 'note type')}`,
              ]);
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.byKeywords(instance.title);
              InventoryInstance.openHoldings(['']);
              InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
              ItemRecordView.waitLoading();
              ItemRecordView.checkItemAdministrativeNote(administrativeNoteText);
              ItemRecordView.checkMultipleItemNotesWithStaffOnly(
                0,
                'Yes',
                centralSharedItemNoteType.payload.name,
                sharedNoteText,
              );
              ItemRecordView.checkMultipleItemNotesWithStaffOnly(
                1,
                'No',
                localItemNoteType.name,
                localNoteText,
              );
              ItemRecordView.checkCheckInNote(checkInNoteText, 'No');
              ItemRecordView.checkCheckOutNote(checkOutNoteText);
            });

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);

            instances.forEach((instance) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.byKeywords(instance.title);
              InventoryInstance.openHoldings(['']);
              InventoryInstance.openItemByBarcode(instance.barcodeInUniversity);
              ItemRecordView.waitLoading();
              ItemRecordView.checkItemAdministrativeNote(administrativeNoteText);
              ItemRecordView.checkMultipleItemNotesWithStaffOnly(
                0,
                'Yes',
                centralSharedItemNoteType.payload.name,
                sharedNoteText,
              );
              ItemRecordView.checkCheckInNote(checkInNoteText, 'No');
              ItemRecordView.checkCheckOutNote(checkOutNoteText);
              ItemRecordView.checkItemNoteAbsent(localItemNoteType.name);
            });
          },
        );
      });
    });
  },
);
