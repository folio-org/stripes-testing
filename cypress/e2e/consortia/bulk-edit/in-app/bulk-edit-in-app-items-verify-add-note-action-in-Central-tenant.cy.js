import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
// import ExportFile from '../../../../support/fragments/data-export/exportFile';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
// import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemNoteTypes from '../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  // APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
// import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let errorsFromCommittingFileName;
const postfix = randomFourDigitNumber();
const folioInstance = {
  title: `C477648_${postfix} folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const marcInstance = {
  title: `C477648_${postfix} marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  barcodeInUniversity: `Item_University${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const administrativeNoteText = 'Administratie note  ~,!,@,#,$,%,^,&,*,(,),~, {.[,]<},>,ø, Æ, §,;,';
const sharedNoteText = 'New shared note';
const localNoteText = 'New local note';
const checkInNoteText = 'Check in note  ~,!,@,#,$,%,^,&,*,(,),~, {.[,]<},>,ø, Æ, §,;,';
const checkOutNoteText = 'Check out note staff only';
const itemNoteTypeConsortium = { name: 'Action note' };
const localItemNoteType = { name: `College NoteType ${getRandomPostfix()}` };

const instances = [folioInstance, marcInstance];
// const reasonForError = 'New status value "Missing" is not allowed';
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const matchedRecordsFileName = `${todayDate}-Matched-Records-${itemUUIDsFileName}`;
const previewFileName = `${todayDate}-Updates-Preview-${itemUUIDsFileName}`;
const changedRecordsFileName = `${todayDate}-Changed-Records-${itemUUIDsFileName}`;

// create shared item note type in precondition, try to check the .csv file values using method with transformation to json

describe('Bulk-edit', () => {
  describe('In-app', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
          ]);

          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          InventoryInstances.getItemNoteTypes({
            query: `name="${itemNoteTypeConsortium.name}"`,
          }).then((res) => {
            itemNoteTypeConsortium.id = res[0].id;
          });

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

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);
        ItemNoteTypes.deleteItemNoteTypeViaApi(localItemNoteType.id);

        cy.deleteItemViaApi(folioInstance.itemIds[0]);
        cy.deleteItemViaApi(marcInstance.itemIds[0]);
        cy.deleteHoldingRecordViaApi(folioInstance.holdingIds[0]);
        cy.deleteHoldingRecordViaApi(marcInstance.holdingIds[0]);

        cy.setTenant(Affiliations.University);

        cy.deleteItemViaApi(folioInstance.itemIds[1]);
        cy.deleteItemViaApi(marcInstance.itemIds[1]);

        cy.deleteHoldingRecordViaApi(folioInstance.holdingIds[1]);
        cy.deleteHoldingRecordViaApi(marcInstance.holdingIds[1]);
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
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
          // 1
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount(4);
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
          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // 4
          cy.pause();
          BulkEditActions.openActions();
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            false,
          );
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            `${localItemNoteType.name} (${Affiliations.College})`,
            false,
          );

          // 5
          BulkEditSearchPane.changeShowColumnCheckbox([
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            `${localItemNoteType.name} (${Affiliations.College})`,
            'Member',
          ]);
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
          );
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            `${localItemNoteType.name} (${Affiliations.College})`,
          );
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked('Member');

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
              '',
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              `${localItemNoteType.name} (${Affiliations.College})`,
              '',
            );
          });

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.barcodeInCollege,
              'Member',
              tenantNames.college,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.barcodeInUniversity,
              'Member',
              tenantNames.university,
            );
          });

          // 6
          BulkEditSearchPane.changeShowColumnCheckbox([
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            `${localItemNoteType.name} (${Affiliations.College})`,
          ]);
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
            false,
          );
          BulkEditSearchPane.verifyCheckboxInActionsDropdownMenuChecked(
            `${localItemNoteType.name} (${Affiliations.College})`,
            false,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
          );
          BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(
            `${localItemNoteType.name} (${Affiliations.College})`,
          );

          // 7
          BulkEditActions.downloadMatchedResults();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
              '',
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              `${localItemNoteType.name} (${Affiliations.College})`,
              '',
            );
          });

          // 8
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 9
          BulkEditActions.clickOptionsSelection();
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown('Action note');
          BulkEditActions.verifyOptionExistsInSelectOptionDropdown(
            `${localItemNoteType.name} (${Affiliations.College})`,
          );

          // 10
          BulkEditActions.selectOption('Administrative note');
          BulkEditActions.verifyOptionSelected('Administrative note');

          // 11
          BulkEditActions.selectSecondAction('Add note');
          BulkEditActions.verifySecondActionSelected('Add note');

          // 12
          BulkEditActions.fillInSecondTextArea(administrativeNoteText);
          BulkEditActions.verifyValueInSecondTextArea(administrativeNoteText);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 13
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(1);

          // 14
          BulkEditActions.selectOption('Action note', 1);
          BulkEditActions.verifyOptionSelected('Action note', 1);
          BulkEditActions.selectSecondAction('Add note', 1);
          BulkEditActions.verifySecondActionSelected('Add note', 1);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 1);

          // 15
          BulkEditActions.fillInSecondTextArea(sharedNoteText, 1);
          BulkEditActions.verifyValueInSecondTextArea(sharedNoteText, 1);
          BulkEditActions.checkStaffOnlyCheckbox(1);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 16
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(2);
          BulkEditActions.selectOption(`${localItemNoteType.name} (${Affiliations.College})`, 2);
          BulkEditActions.verifyOptionSelected(
            `${localItemNoteType.name} (${Affiliations.College})`,
            2,
          );
          BulkEditActions.selectSecondAction('Add note', 2);
          BulkEditActions.verifySecondActionSelected('Add note', 2);
          BulkEditActions.fillInSecondTextArea(localNoteText, 2);
          BulkEditActions.verifyValueInSecondTextArea(localNoteText, 2);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 17
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(3);
          BulkEditActions.selectOption('Check in note', 3);
          BulkEditActions.verifyOptionSelected('Check in note', 3);
          BulkEditActions.selectSecondAction('Add note', 3);
          BulkEditActions.verifySecondActionSelected('Add note', 3);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 3);

          // 18
          BulkEditActions.fillInSecondTextArea(checkInNoteText, 3);
          BulkEditActions.verifyValueInSecondTextArea(checkInNoteText, 3);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 19
          BulkEditActions.addNewBulkEditFilterString();
          BulkEditActions.verifyNewBulkEditRow(4);
          BulkEditActions.selectOption('Check out note', 4);
          BulkEditActions.verifyOptionSelected('Check out note', 4);
          BulkEditActions.selectSecondAction('Add note', 4);
          BulkEditActions.verifySecondActionSelected('Add note', 4);
          BulkEditActions.verifyStaffOnlyCheckbox(false, 4);

          // 20
          BulkEditActions.fillInSecondTextArea(checkOutNoteText, 4);
          BulkEditActions.verifyValueInSecondTextArea(checkOutNoteText, 4);
          BulkEditActions.checkStaffOnlyCheckbox(4);
          BulkEditSearchPane.isConfirmButtonDisabled(false);

          // 21
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              administrativeNoteText,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
              `${sharedNoteText} (staff only)`,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              `${localItemNoteType.name} (${Affiliations.College})`,
              localNoteText,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              checkInNoteText,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              `${checkOutNoteText} (staff only)`,
            );
          });

          BulkEditActions.verifyAreYouSureForm(4);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.barcodeInCollege,
              'Member',
              tenantNames.college,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              instance.barcodeInUniversity,
              'Member',
              tenantNames.university,
            );
          });

          // 22
          BulkEditActions.downloadPreview();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
              administrativeNoteText,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ACTION_NOTE,
              `${sharedNoteText} (staff only)`,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              `${localItemNoteType.name} (${Affiliations.College})`,
              localNoteText,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              checkInNoteText,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              `${checkOutNoteText} (staff only)`,
            );
          });

          // 23

          //   BulkEditActions.commitChanges();
          //   BulkEditActions.verifySuccessBanner(2);

          //   itemBarcodeWithAvailableStatus.forEach((barcode) => {
          //     BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.MISSING,
          //     );
          //   });

          //   BulkEditSearchPane.verifyErrorLabelAfterChanges('Bulk edit query', 2, 2);

          //   checkedOutItemIds.forEach((id) => {
          //     BulkEditSearchPane.verifyErrorByIdentifier(id, reasonForError);
          //   });

          //   BulkEditActions.openActions();
          //   BulkEditActions.downloadChangedCSV();

          //   itemBarcodeWithAvailableStatus.forEach((barcode) => {
          //     BulkEditFiles.verifyValueInRowByUUID(
          //       changedRecordsQueryFileName,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.MISSING,
          //     );
          //   });

          //   BulkEditActions.downloadErrors();

          //   checkedOutItemIds.forEach((checkedOutItemId) => {
          //     ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          //       `${checkedOutItemId},${reasonForError}`,
          //     ]);
          //   });

          //   // remove earlier downloaded files
          //   FileManager.deleteFileFromDownloadsByMask(
          //     matchedRecordsQueryFileName,
          //     previewQueryFileName,
          //     changedRecordsQueryFileName,
          //     errorsFromCommittingFileName,
          //   );

          //   BulkEditSearchPane.openLogsSearch();
          //   BulkEditLogs.verifyLogsPane();
          //   BulkEditLogs.checkItemsCheckbox();
          //   BulkEditLogs.verifyCheckboxIsSelected('ITEM', true);
          //   BulkEditLogs.clickActionsRunBy(user.username);
          //   BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();
          //   BulkEditLogs.downloadQueryIdentifiers();
          //   ExportFile.verifyFileIncludes(identifiersQueryFilename, [
          //     ...checkedOutItemIds,
          //     ...availableItemIds,
          //   ]);
          //   BulkEditLogs.downloadFileWithMatchingRecords();

          //   itemBarcodeWithAvailableStatus.forEach((barcode) => {
          //     BulkEditFiles.verifyValueInRowByUUID(
          //       matchedRecordsQueryFileName,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.AVAILABLE,
          //     );
          //   });
          //   itemBarcodeWithCheckedOutStatus.forEach((barcode) => {
          //     BulkEditFiles.verifyValueInRowByUUID(
          //       matchedRecordsQueryFileName,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.CHECKED_OUT,
          //     );
          //   });

          //   BulkEditLogs.downloadFileWithProposedChanges();

          //   itemBarcodes.forEach((barcode) => {
          //     BulkEditFiles.verifyValueInRowByUUID(
          //       previewQueryFileName,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.MISSING,
          //     );
          //   });

          //   BulkEditLogs.downloadFileWithUpdatedRecords();

          //   itemBarcodeWithAvailableStatus.forEach((barcode) => {
          //     BulkEditFiles.verifyValueInRowByUUID(
          //       changedRecordsQueryFileName,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.MISSING,
          //     );
          //   });

          //   BulkEditLogs.downloadFileWithCommitErrors();

          //   checkedOutItemIds.forEach((checkedOutItemId) => {
          //     ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
          //       `${checkedOutItemId},${reasonForError}`,
          //     ]);
          //   });

          //   ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          //   itemBarcodeWithAvailableStatus.forEach((barcode) => {
          //     TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          //     InventorySearchAndFilter.switchToItem();
          //     InventorySearchAndFilter.searchByParameter('Barcode', barcode);
          //     ItemRecordView.waitLoading();
          //     ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.MISSING);
          //   });
          //   itemBarcodeWithCheckedOutStatus.forEach((barcode) => {
          //     TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          //     InventorySearchAndFilter.switchToItem();
          //     InventorySearchAndFilter.searchByParameter('Barcode', barcode);
          //     ItemRecordView.waitLoading();
          //     ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);
          //   });
        },
      );
    });
  });
});
