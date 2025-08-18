import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import DateTools from '../../../../support/utils/dateTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
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
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let errorsFromCommittingFileName;
const checkedOutItemIds = [];
const availableItemIds = [];
const postfix = randomFourDigitNumber();
const folioInstance = {
  title: `AT_C566175_${postfix}_FolioInstance_${getRandomPostfix()}`,
  availableItemBarcode: `Item_available${getRandomPostfix()}`,
  checkedOutItemBarcode: `Item_checkedOut${getRandomPostfix()}`,
};
const marcInstance = {
  title: `AT_C566175_${postfix}_MarcInstance_${getRandomPostfix()}`,
  availableItemBarcode: `Item_available${getRandomPostfix()}`,
  checkedOutItemBarcode: `Item_checkedOut${getRandomPostfix()}`,
};
const instances = [folioInstance, marcInstance];
const reasonForError = 'New status value "Missing" is not allowed';
const itemBarcodeWithAvailableStatus = [
  folioInstance.availableItemBarcode,
  marcInstance.availableItemBarcode,
];
const itemBarcodeWithCheckedOutStatus = [
  folioInstance.checkedOutItemBarcode,
  marcInstance.checkedOutItemBarcode,
];
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');

describe('Bulk-edit', () => {
  describe('Member tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

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
            })
            .then(() => {
              // create folio instance
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
              // create marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.uuid = instanceId;
              });
            })
            .then(() => {
              // create holdings in member tenant
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                materialTypeId = res.id;
              });

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.uuid,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingId = holding.id;
                });
                cy.wait(1000);
              });
            })
            .then(() => {
              // create items in member tenant
              instances.forEach((instance) => {
                InventoryItems.createItemViaApi({
                  barcode: instance.availableItemBarcode,
                  holdingsRecordId: instance.holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  availableItemIds.push(item.id);
                });
                cy.wait(1000);
                InventoryItems.createItemViaApi({
                  barcode: instance.checkedOutItemBarcode,
                  holdingsRecordId: instance.holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
                }).then((item) => {
                  checkedOutItemIds.push(item.id);
                });
                cy.wait(1000);
              });
            });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(itemFieldValues.itemStatus);
          QueryModal.verifySelectedField(itemFieldValues.itemStatus);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueMultiselect(ITEM_STATUS_NAMES.AVAILABLE);
          QueryModal.fillInValueMultiselect(ITEM_STATUS_NAMES.CHECKED_OUT);
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.instanceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield(`AT_C566175_${postfix}`, 1);
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickTestQuery();
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.uuid);
        });
        FileManager.deleteFile(`cypress/fixtures/downloaded-${identifiersQueryFilename}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          errorsFromCommittingFileName,
          identifiersQueryFilename,
        );
      });

      it(
        'C566175 Verify "Replace with" action for Items status in Member tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566175'] },
        () => {
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `${today}-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `${today}-Updates-Preview-CSV-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `${today}-Changed-Records-CSV-Query-${interceptedUuid}.csv`;
            errorsFromCommittingFileName = `${today}-Committing-changes-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('4 item');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(items.status_name in [Available, Checked out]) AND (instances.title starts with AT_C566175_${postfix})`,
            );

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.AVAILABLE,
              );
            });
            itemBarcodeWithCheckedOutStatus.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.CHECKED_OUT,
              );
            });

            BulkEditSearchPane.verifyPaginatorInMatchedRecords(4);
            BulkEditActions.downloadMatchedResults();

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.AVAILABLE,
              );
            });
            itemBarcodeWithCheckedOutStatus.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.CHECKED_OUT,
              );
            });

            BulkEditActions.openInAppStartBulkEditFrom();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditActions.verifyConfirmButtonDisabled(true);
            BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.MISSING);
            BulkEditSearchPane.verifyInputLabel(ITEM_STATUS_NAMES.MISSING);
            BulkEditActions.replaceWithIsDisabled();
            BulkEditActions.verifyConfirmButtonDisabled(false);
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

            const itemBarcodes = [
              folioInstance.availableItemBarcode,
              folioInstance.checkedOutItemBarcode,
              marcInstance.availableItemBarcode,
              marcInstance.checkedOutItemBarcode,
            ];

            itemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditActions.verifyAreYouSureForm(4);
            BulkEditActions.downloadPreview();

            itemBarcodes.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditSearchPane.verifyErrorLabel(2);

            checkedOutItemIds.forEach((id) => {
              BulkEditSearchPane.verifyErrorByIdentifier(id, reasonForError);
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadChangedCSV();

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditActions.downloadErrors();

            checkedOutItemIds.forEach((checkedOutItemId) => {
              ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
                `${checkedOutItemId},${reasonForError}`,
              ]);
            });

            // remove earlier downloaded files
            FileManager.deleteFileFromDownloadsByMask(
              matchedRecordsQueryFileName,
              previewQueryFileName,
              changedRecordsQueryFileName,
              errorsFromCommittingFileName,
            );

            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();
            BulkEditLogs.checkItemsCheckbox();
            BulkEditLogs.verifyCheckboxIsSelected('ITEM', true);
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();
            BulkEditLogs.downloadQueryIdentifiers();
            ExportFile.verifyFileIncludes(identifiersQueryFilename, [
              ...checkedOutItemIds,
              ...availableItemIds,
            ]);
            BulkEditLogs.downloadFileWithMatchingRecords();

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.AVAILABLE,
              );
            });
            itemBarcodeWithCheckedOutStatus.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.CHECKED_OUT,
              );
            });

            BulkEditLogs.downloadFileWithProposedChanges();

            itemBarcodes.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                previewQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditLogs.downloadFileWithUpdatedRecords();

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                changedRecordsQueryFileName,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditLogs.downloadFileWithCommitErrors();

            checkedOutItemIds.forEach((checkedOutItemId) => {
              ExportFile.verifyFileIncludes(errorsFromCommittingFileName, [
                `${checkedOutItemId},${reasonForError}`,
              ]);
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.waitLoading();
            InventorySearchAndFilter.switchToItem();

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              InventorySearchAndFilter.searchByParameter('Barcode', barcode);
              ItemRecordView.waitLoading();
              ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.MISSING);
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });
            itemBarcodeWithCheckedOutStatus.forEach((barcode) => {
              InventorySearchAndFilter.searchByParameter('Barcode', barcode);
              ItemRecordView.waitLoading();
              ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });
          });
        },
      );
    });
  });
});
