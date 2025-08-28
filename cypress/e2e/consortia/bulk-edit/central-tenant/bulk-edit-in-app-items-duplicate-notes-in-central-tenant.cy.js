import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
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
const folioInstance = {
  title: `C494096 folio instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const marcInstance = {
  title: `C494096 marc instance testBulkEdit_${getRandomPostfix()}`,
  barcodeInCollege: `Item_College${getRandomPostfix()}`,
  itemIds: [],
  holdingIds: [],
};
const checkInNoteFirstText = 'Check in note first text';
const checkInNoteSecondText = 'Check in note second text';
const instances = [folioInstance, marcInstance];
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = BulkEditFiles.getMatchedRecordsFileName(itemUUIDsFileName, true);
const previewFileName = BulkEditFiles.getPreviewFileName(itemUUIDsFileName, true);
const changedRecordsFileName = BulkEditFiles.getChangedRecordsFileName(itemUUIDsFileName, true);

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
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
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            loanTypeId = res[0].id;
          });
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;

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
                  circulationNotes: [
                    { note: checkInNoteFirstText, noteType: 'Check in', staffOnly: false },
                    { note: checkInNoteSecondText, noteType: 'Check in', staffOnly: true },
                  ],
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

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        instances.forEach((instance) => {
          cy.deleteItemViaApi(instance.itemIds[0]);
          cy.deleteHoldingRecordViaApi(instance.holdingIds[0]);
        });

        cy.resetTenant();
        cy.getAdminToken();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        });

        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C494096 Verify "Duplicate to" action for Items notes in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494096'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);

          const itemBarcodes = [folioInstance.barcodeInCollege, marcInstance.barcodeInCollege];

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditActions.downloadMatchedResults();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.duplicateCheckInNote();
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.downloadPreview();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_OUT_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
            ItemRecordView.waitLoading();
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              3,
              'NoYes',
              'Check out note',
              `${checkInNoteFirstText}${checkInNoteSecondText}`,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              4,
              'NoYes',
              'Check in note',
              `${checkInNoteFirstText}${checkInNoteSecondText}`,
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.waitLoading();
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(itemUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('2 item');
          BulkEditSearchPane.verifyFileNameHeadLine(itemUUIDsFileName);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();
          BulkEditActions.openActions();
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
            );
          });

          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);
          BulkEditActions.duplicateCheckInNote('out');
          BulkEditActions.verifyConfirmButtonDisabled(false);
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyMessageBannerInAreYouSureForm(2);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only) | ${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          BulkEditActions.verifyAreYouSureForm(2);
          BulkEditActions.downloadPreview();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              previewFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only) | ${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(2);

          itemBarcodes.forEach((barcode) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only) | ${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          itemBarcodes.forEach((barcode) => {
            BulkEditFiles.verifyValueInRowByUUID(
              changedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
              barcode,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.CHECK_IN_NOTE,
              `${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only) | ${checkInNoteFirstText} | ${checkInNoteSecondText} (staff only)`,
            );
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          instances.forEach((instance) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.byKeywords(instance.title);
            InventoryInstance.openHoldings(['']);
            InventoryInstance.openItemByBarcode(instance.barcodeInCollege);
            ItemRecordView.waitLoading();

            ItemRecordView.checkCirculationNotesWithStaffOnly(
              3,
              'NoYes',
              'Check out note',
              `${checkInNoteFirstText}${checkInNoteSecondText}`,
            );
            ItemRecordView.checkCirculationNotesWithStaffOnly(
              4,
              'NoYesNoYes',
              'Check in note',
              `${checkInNoteFirstText}${checkInNoteSecondText}${checkInNoteFirstText}${checkInNoteSecondText}`,
            );
          });
        },
      );
    });
  });
});
