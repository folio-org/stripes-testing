import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import QickMarcEditor from '../../../../support/fragments/quickMarcEditor';
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
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
let holdingTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let identifiersQueryFilename;
let matchedRecordsQueryFileName;
let previewQueryFileName;
let changedRecordsQueryFileName;
let errorsFromCommittingFileName;
let previewFileName;
let changedRecordsFileName;
const folioInstance = {
  title: `C496144 folio instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode1: `folioItem_available${getRandomPostfix()}`,
  itemBarcode2: `folioItem_checkedOut${getRandomPostfix()}`,
};
const marcInstance = {
  title: `C496144 marc instance testBulkEdit_${getRandomPostfix()}`,
  itemBarcode1: `Item_available${getRandomPostfix()}`,
  itemBarcode2: `Item_checkedOut${getRandomPostfix()}`,
};
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const leader = QickMarcEditor.defaultValidLdr;
const getMarcBibFields = (intsanceTitle) => {
  return [
    {
      tag: '008',
      content: QickMarcEditor.defaultValid008Values,
    },
    {
      tag: '245',
      content: `$a ${intsanceTitle}`,
      indicators: ['1', '1'],
    },
  ];
};

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteInstanceByTitleViaApi('C496144*');

        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
          permissions.bulkEditQueryView.gui,
          permissions.bulkEditLogsView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditItems.gui,
            permissions.bulkEditQueryView.gui,
          ]);

          cy.resetTenant();

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            holdingTypeId = res[0].id;
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
          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // folio instance with items
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
                holdings: [
                  {
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: locationId,
                  },
                ],
                items: [
                  {
                    barcode: folioInstance.itemBarcode1,
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                  },
                  {
                    barcode: folioInstance.itemBarcode2,
                    status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
                    permanentLoanType: { id: loanTypeId },
                    materialType: { id: materialTypeId },
                  },
                ],
              }).then((createdInstanceData) => {
                folioInstance.uuid = createdInstanceData.instanceId;
                folioInstance.holdingId = createdInstanceData.holdings[0].id;

                cy.getInstanceById(folioInstance.uuid).then((instanceData) => {
                  folioInstance.hrid = instanceData.hrid;
                });
                // marc instance with items
                cy.createMarcBibliographicViaAPI(leader, getMarcBibFields(marcInstance.title)).then(
                  (instanceId) => {
                    marcInstance.uuid = instanceId;

                    cy.getInstanceById(marcInstance.uuid).then((instanceData) => {
                      marcInstance.hrid = instanceData.hrid;

                      InventoryHoldings.createHoldingRecordViaApi({
                        instanceId,
                        permanentLocationId: locationId,
                        sourceId,
                      }).then((holdingData) => {
                        marcInstance.holdingId = holdingData.id;

                        cy.createItem({
                          holdingsRecordId: holdingData.id,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                          barcode: marcInstance.itemBarcode1,
                        });
                        cy.createItem({
                          holdingsRecordId: holdingData.id,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
                          barcode: marcInstance.itemBarcode2,
                        });
                      });
                    });

                    cy.login(user.username, user.password, {
                      path: TopMenu.bulkEditPath,
                      waiter: BulkEditSearchPane.waitLoading,
                    });
                    ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

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
                    QueryModal.fillInValueTextfield('C496144', 1);
                    cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as(
                      'getPreview',
                    );
                    QueryModal.clickTestQuery();
                  },
                );
              });
            });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/downloaded-${identifiersQueryFilename}`);
        FileManager.deleteFileFromDownloadsByMask(
          identifiersQueryFilename,
          matchedRecordsQueryFileName,
          previewQueryFileName,
          changedRecordsQueryFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C496144 Verify "Replace with" action for Items status in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C496144'] },
        () => {
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();
          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            identifiersQueryFilename = `Query-${interceptedUuid}.csv`;
            matchedRecordsQueryFileName = `${today}-Matched-Records-Query-${interceptedUuid}.csv`;
            previewQueryFileName = `${today}-Updates-Preview-Query-${interceptedUuid}.csv`;
            changedRecordsQueryFileName = `${today}-Changed-Records-Query-${interceptedUuid}.csv`;
            errorsFromCommittingFileName = `${today}-Committing-changes-Errors-Query-${interceptedUuid}`;

            // BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane(2);
            // BulkEditSearchPane.verifyQueryHeadLine(
            //   '(instance.staff_suppress == "false") AND (instance.title starts with "C477642")',
            // );

            const itemBarcodes = [
              folioInstance.itemBarcode1,
              folioInstance.itemBarcode2,
              marcInstance.itemBarcode1,
              marcInstance.itemBarcode2,
            ];
            const itemBarcodeWithAvailableStatus = [
              folioInstance.itemBarcode1,
              marcInstance.itemBarcode1,
            ];
            const itemBarcodeWithCheckedOutStatus = [
              folioInstance.itemBarcode2,
              marcInstance.itemBarcode2,
            ];

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

            BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
            BulkEditSearchPane.verifyNextPaginationButtonDisabled();

            // 2
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

            // 3
            BulkEditActions.openInAppStartBulkEditFrom();
            BulkEditSearchPane.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyOptionsDropdown();
            BulkEditActions.verifyRowIcons();
            BulkEditActions.verifyCancelButtonDisabled(false);
            BulkEditSearchPane.isConfirmButtonDisabled(true);

            // 4
            BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.MISSING);
            BulkEditSearchPane.verifyInputLabel(ITEM_STATUS_NAMES.MISSING);
            BulkEditActions.replaceWithIsDisabled();
            BulkEditSearchPane.isConfirmButtonDisabled(false);

            // 6

            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

            itemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditActions.verifyAreYouSureForm(4);

            // 7
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

            // 8
            BulkEditActions.commitChanges();
            BulkEditActions.verifySuccessBanner(2);

            const holdingIds = [folioInstance.holdingId, marcInstance.holdingId];

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
                ITEM_STATUS_NAMES.MISSING,
              );
            });

            BulkEditSearchPane.verifyErrorLabel('Bulk edit query', 2, 2);

            // 9
            holdingIds.forEach((id) => {
              BulkEditSearchPane.verifyReasonForErrorByIdentifier(
                id,
                `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
              );
            });

            // 10

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
            BulkEditFiles.verifyCSVFileRows(errorsFromCommittingFileName, [
              [
                folioInstance.holdingId,
                `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
              ],
              [
                marcInstance.holdingId,
                `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
              ],
            ]);

            // 12
            BulkEditSearchPane.openLogsSearch();
            BulkEditLogs.verifyLogsPane();

            // 13
            BulkEditLogs.checkItemsCheckbox();
            BulkEditLogs.verifyCheckboxIsSelected('ITEMS', true);

            // 14
            BulkEditLogs.clickActionsRunBy(user.username);
            BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

            // 15
            BulkEditLogs.downloadQueryIdentifiers();
            // clarify what identifiers will be in this file
            ExportFile.verifyFileIncludes(identifiersQueryFilename, [
              folioInstance.uuid,
              marcInstance.uuid,
            ]);

            // 16
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

            // 17
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

            // 18
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

            // 19
            BulkEditLogs.downloadFileWithCommitErrors();
            BulkEditFiles.verifyCSVFileRows(errorsFromCommittingFileName, [
              [
                folioInstance.holdingId,
                `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
              ],
              [
                marcInstance.holdingId,
                `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
              ],
            ]);

            // 20
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

            itemBarcodeWithAvailableStatus.forEach((barcode) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.searchByParameter('Barcode', barcode);
              ItemRecordView.waitLoading();
              ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.MISSING);
            });
            itemBarcodeWithCheckedOutStatus.forEach((barcode) => {
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.searchByParameter('Barcode', barcode);
              ItemRecordView.waitLoading();
              ItemRecordView.verifyItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);
            });
          });
        },
      );
    });
  });
});
