import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import SelectLocationsModal from '../../../../support/fragments/bulk-edit/select-locations-modal';
// import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
// import ExportFile from '../../../../support/fragments/data-export/exportFile';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
// import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
// mport QickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DateTools from '../../../../support/utils/dateTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  // APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  // ITEM_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
// import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

let user;
let instanceTypeId;
// let holdingTypeId;
let locationId;
let temporaryLocationId;
let sourceId;
const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `${today}-Matched-Records-${holdingUUIDsFileName}`;
const previewFileName = `${today}-Updates-Preview-${holdingUUIDsFileName}`;
const changedRecordsFileName = `${today}-Changed-Records-${holdingUUIDsFileName}`;
const folioInstance = {
  title: `C494363 folio instance testBulkEdit_${getRandomPostfix()}`,
  holdingIdsInCollege: null,
  holdingHridsInCollege: null,
  holdingIdsInUniversity: null,
  holdingHridsInUniversity: null,
};
const marcInstance = {
  title: `C494363 marc instance testBulkEdit_${getRandomPostfix()}`,
  holdingIdsInCollege: null,
  holdingHridsInCollege: null,
  holdingIdsInUniversity: null,
  holdingHridsInUniversity: null,
};
const instances = [folioInstance, marcInstance];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditHoldings.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, [
            permissions.bulkEditEdit.gui,
            permissions.uiInventoryViewCreateEditHoldings.gui,
          ]);

          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          // no main library location on ecs snapshot, return back
          // { query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.ONLINE}"` }).then((res) => {
            temporaryLocationId = res.id;
          });

          InventoryHoldings.getHoldingsFolioSource()
            .then((folioSource) => {
              sourceId = folioSource.id;
            })
            .then(() => {
              // create shared folio instance
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.id = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              // create shared marc instance
              cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
                marcInstance.id = instanceId;
              });
            })
            .then(() => {
              // create holdings in College tenant
              cy.setTenant(Affiliations.College);
              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.id,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIdsInCollege = holding.id;

                  cy.getHoldings({
                    limit: 1,
                    query: `"instanceId"="${instance.id}"`,
                  }).then((holdings) => {
                    instance.holdingHridsInCollege = holdings[0].hrid;
                  });
                });
                cy.wait(1000);
              });
              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${marcInstance.id}"`,
              }).then((holdings) => {
                cy.updateHoldingRecord(marcInstance.holdingIdsInCollege, {
                  ...holdings[0],
                  temporaryLocationId,
                });
              });
            })
            .then(() => {
              // create holdings in University tenant
              cy.setTenant(Affiliations.University);

              instances.forEach((instance) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instance.id,
                  permanentLocationId: locationId,
                  sourceId,
                }).then((holding) => {
                  instance.holdingIdsInUniversity = holding.id;

                  cy.getHoldings({
                    limit: 1,
                    query: `"instanceId"="${instance.id}"`,
                  }).then((holdings) => {
                    instance.holdingHridsInUniversity = holdings[0].hrid;
                  });
                });
                cy.wait(1000);
              });
              cy.getHoldings({
                limit: 1,
                query: `"instanceId"="${folioInstance.id}"`,
              }).then((holdings) => {
                cy.updateHoldingRecord(folioInstance.holdingIdsInUniversity, {
                  ...holdings[0],
                  temporaryLocationId,
                });
              });
            })
            .then(() => {
              FileManager.createFile(
                `cypress/fixtures/${holdingUUIDsFileName}`,
                `${folioInstance.holdingIdsInCollege}\r\n${folioInstance.holdingIdsInUniversity}\r\n${marcInstance.holdingIdsInCollege}\r\n${marcInstance.holdingIdsInUniversity}`,
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
        InventoryInstance.deleteInstanceViaApi(marcInstance.uuid);
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsFileName,
          previewFileName,
          changedRecordsFileName,
        );
      });

      it(
        'C494363 Verify "Replace with" action for Holdings location in Central tenant (consortia) (firebird)',
        { tags: ['smokeECS', 'firebird', 'C494363'] },
        () => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount(4);
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInCollege,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              instance.holdingHridsInUniversity,
            );
          });

          BulkEditSearchPane.verifyPreviousPaginationButtonDisabled();
          BulkEditSearchPane.verifyNextPaginationButtonDisabled();

          // 4
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );
          instances.forEach((instance) => {
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              LOCATION_NAMES.MAIN_LIBRARY,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instance.holdingHridsInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              LOCATION_NAMES.MAIN_LIBRARY,
            );
          });
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.holdingHridsInCollege,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            '',
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            folioInstance.holdingHridsInUniversity,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            LOCATION_NAMES.ONLINE_UI,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.holdingHridsInCollege,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            LOCATION_NAMES.ONLINE_UI,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            marcInstance.holdingHridsInUniversity,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
            '',
          );

          // 5
          BulkEditSearchPane.changeShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          instances.forEach((instance) => {
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingIdsInCollege,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              LOCATION_NAMES.MAIN_LIBRARY,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
              instance.holdingIdsInUniversity,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              LOCATION_NAMES.MAIN_LIBRARY,
            );
          });

          // 6
          BulkEditActions.openInAppStartBulkEditFrom();
          BulkEditSearchPane.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditSearchPane.isConfirmButtonDisabled(true);

          // 7
          BulkEditActions.selectOption('Permanent holdings location');
          BulkEditSearchPane.verifyInputLabel('Permanent holdings location');
          BulkEditActions.replaceWithIsDisabled();

          // 8,9,10
          BulkEditActions.locationLookupExists();
          BulkEditActions.clickLocationLookup();
          // the method created but not checked yet
          SelectLocationsModal.verifyLocationLookupModalInCentralTenant();

          // 11
          SelectLocationsModal.verifyTenantsInAffiliationDropdown(
            tenantNames.college,
            tenantNames.university,
          );
          //   // 4
          //   BulkEditActions.replaceItemStatus(ITEM_STATUS_NAMES.MISSING);
          //   BulkEditSearchPane.verifyInputLabel(ITEM_STATUS_NAMES.MISSING);
          //   BulkEditActions.replaceWithIsDisabled();
          //   BulkEditSearchPane.isConfirmButtonDisabled(false);

          //   // 6
          //   BulkEditActions.confirmChanges();
          //   BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

          //   itemBarcodes.forEach((barcode) => {
          //     BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.MISSING,
          //     );
          //   });

          //   BulkEditActions.verifyAreYouSureForm(4);

          //   // 7
          //   BulkEditActions.downloadPreview();

          //   itemBarcodes.forEach((barcode) => {
          //     BulkEditFiles.verifyValueInRowByUUID(
          //       previewQueryFileName,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.MISSING,
          //     );
          //   });

          //   // 8
          //   BulkEditActions.commitChanges();
          //   BulkEditActions.verifySuccessBanner(2);

          //   const holdingIds = [folioInstance.holdingId, marcInstance.holdingId];

          //   itemBarcodeWithAvailableStatus.forEach((barcode) => {
          //     BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
          //       barcode,
          //       BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATUS,
          //       ITEM_STATUS_NAMES.MISSING,
          //     );
          //   });

          //   BulkEditSearchPane.verifyErrorLabel('Bulk edit query', 2, 2);

          //   // 9
          //   holdingIds.forEach((id) => {
          //     BulkEditSearchPane.verifyReasonForErrorByIdentifier(
          //       id,
          //       `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
          //     );
          //   });

          //   // 10
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
          //   BulkEditFiles.verifyCSVFileRows(errorsFromCommittingFileName, [
          //     [
          //       folioInstance.holdingId,
          //       `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
          //     ],
          //     [
          //       marcInstance.holdingId,
          //       `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
          //     ],
          //   ]);

          //   // remove earlier downloaded files
          //   FileManager.deleteFileFromDownloadsByMask(
          //     matchedRecordsQueryFileName,
          //     previewQueryFileName,
          //     changedRecordsQueryFileName,
          //     errorsFromCommittingFileName,
          //   );

          //   // 12
          //   BulkEditSearchPane.openLogsSearch();
          //   BulkEditLogs.verifyLogsPane();

          //   // 13
          //   BulkEditLogs.checkItemsCheckbox();
          //   BulkEditLogs.verifyCheckboxIsSelected('ITEMS', true);

          //   // 14
          //   BulkEditLogs.clickActionsRunBy(user.username);
          //   BulkEditLogs.verifyLogsRowActionWithoutMatchingErrorWithCommittingErrorsQuery();

          //   // 15
          //   BulkEditLogs.downloadQueryIdentifiers();
          //   // clarify what identifiers will be in this file
          //   ExportFile.verifyFileIncludes(identifiersQueryFilename, [
          //     folioInstance.uuid,
          //     marcInstance.uuid,
          //   ]);

          //   // 16
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

          //   // 17
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

          //   // 18
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

          //   // 19
          //   BulkEditLogs.downloadFileWithCommitErrors();
          //   BulkEditFiles.verifyCSVFileRows(errorsFromCommittingFileName, [
          //     [
          //       folioInstance.holdingId,
          //       `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
          //     ],
          //     [
          //       marcInstance.holdingId,
          //       `New status value "${ITEM_STATUS_NAMES.MISSING}" is not allowed`,
          //     ],
          //   ]);

          //   // 20
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
