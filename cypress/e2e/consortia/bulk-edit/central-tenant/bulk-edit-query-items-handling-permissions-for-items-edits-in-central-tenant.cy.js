import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';

let user;
let instanceTypeId;
let sourceId;
let locationId;
let materialTypeId;
let loanTypeId;
let sharedFolioInstance;
let sharedMarcInstance;
let allItemIds;
let allItemBarcodes;
let collegeItemBarcodes;
let universityItemBarcodes;
const itemInFolioInstance = {
  collegeItemId: null,
  collegeItemBarcode: null,
  universityItemId: null,
  universityItemBarcode: null,
};
const itemInMarcInstance = {
  collegeItemId: null,
  collegeItemBarcode: null,
  universityItemId: null,
  universityItemBarcode: null,
};
const holdingInFolioInstance = {
  collegeHoldingId: null,
  universityHoldingId: null,
};
const holdingInMarcInstance = {
  collegeHoldingId: null,
  universityHoldingId: null,
};
let fileNames;
const newItemNote = `Item note_${getRandomPostfix()}`;
const collegePermissions = [
  permissions.bulkEditView.gui,
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
];
const universityPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewInstances.gui,
];
const centralPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(centralPermissions)
          .then((userProperties) => {
            user = userProperties;

            cy.affiliateUserToTenant({
              tenantId: Affiliations.College,
              userId: user.userId,
              permissions: collegePermissions,
            });

            cy.affiliateUserToTenant({
              tenantId: Affiliations.University,
              userId: user.userId,
              permissions: universityPermissions,
            });
          })
          .then(() => {
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            });
          })
          .then(() => {
            // Create shared FOLIO Instance in Central tenant
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: `AT_C566499_FolioInstance_${getRandomPostfix()}`,
              },
            }).then((createdInstanceData) => {
              sharedFolioInstance = createdInstanceData.instanceId;
            });

            // Create shared MARC Instance in Central tenant
            const marcInstanceTitle = `AT_C566499_MarcInstance_${getRandomPostfix()}`;
            cy.createSimpleMarcBibViaAPI(marcInstanceTitle).then((instanceId) => {
              sharedMarcInstance = instanceId;
            });
          })
          .then(() => {
            // Create Holdings and Items in College tenant
            cy.withinTenant(Affiliations.College, () => {
              cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
                materialTypeId = materialTypes.id;
              });
              cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
                loanTypeId = res[0].id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                locationId = res.id;
              });
              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  sourceId = folioSource.id;
                })
                .then(() => {
                  // holding in FOLIO instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedFolioInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInFolioInstance.collegeHoldingId = holding.id;
                    InventoryItems.createItemViaApi({
                      barcode: `Item_${getRandomPostfix()}`,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      holdingsRecordId: holding.id,
                    }).then((item) => {
                      itemInFolioInstance.collegeItemId = item.id;
                      itemInFolioInstance.collegeItemBarcode = item.barcode;
                    });
                  });

                  // holding in MARC instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedMarcInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInMarcInstance.collegeHoldingId = holding.id;
                    InventoryItems.createItemViaApi({
                      barcode: `Item_${getRandomPostfix()}`,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      holdingsRecordId: holding.id,
                    }).then((item) => {
                      itemInMarcInstance.collegeItemId = item.id;
                      itemInMarcInstance.collegeItemBarcode = item.barcode;
                    });
                  });
                });
            });
          })
          .then(() => {
            // Create Holdings and Items in University tenant
            cy.withinTenant(Affiliations.University, () => {
              cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
                materialTypeId = materialTypes.id;
              });
              cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
                loanTypeId = res[0].id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                locationId = res.id;
              });
              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  sourceId = folioSource.id;
                })
                .then(() => {
                  // holding in FOLIO instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedFolioInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInFolioInstance.universityHoldingId = holding.id;
                    InventoryItems.createItemViaApi({
                      barcode: `Item_${getRandomPostfix()}`,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      holdingsRecordId: holding.id,
                    }).then((item) => {
                      itemInFolioInstance.universityItemId = item.id;
                      itemInFolioInstance.universityItemBarcode = item.barcode;
                    });
                  });

                  // holding in MARC instance
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: sharedMarcInstance,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holding) => {
                    holdingInMarcInstance.universityHoldingId = holding.id;
                    InventoryItems.createItemViaApi({
                      barcode: `Item_${getRandomPostfix()}`,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialTypeId },
                      holdingsRecordId: holding.id,
                    }).then((item) => {
                      itemInMarcInstance.universityItemId = item.id;
                      itemInMarcInstance.universityItemBarcode = item.barcode;
                    });
                  });
                });
            });
          })
          .then(() => {
            // Initialize arrays for test usage
            allItemIds = [
              itemInFolioInstance.collegeItemId,
              itemInFolioInstance.universityItemId,
              itemInMarcInstance.collegeItemId,
              itemInMarcInstance.universityItemId,
            ];
            allItemBarcodes = [
              itemInFolioInstance.collegeItemBarcode,
              itemInFolioInstance.universityItemBarcode,
              itemInMarcInstance.collegeItemBarcode,
              itemInMarcInstance.universityItemBarcode,
            ];
            collegeItemBarcodes = [
              itemInFolioInstance.collegeItemBarcode,
              itemInMarcInstance.collegeItemBarcode,
            ];
            universityItemBarcodes = [
              itemInFolioInstance.universityItemBarcode,
              itemInMarcInstance.universityItemBarcode,
            ];
          })
          .then(() => {
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
        cy.withinTenant(Affiliations.College, () => {
          cy.deleteItemViaApi(itemInFolioInstance.collegeItemId);
          cy.deleteItemViaApi(itemInMarcInstance.collegeItemId);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInFolioInstance.collegeHoldingId);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInMarcInstance.collegeHoldingId);
        });
        cy.withinTenant(Affiliations.University, () => {
          cy.deleteItemViaApi(itemInFolioInstance.universityItemId);
          cy.deleteItemViaApi(itemInMarcInstance.universityItemId);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInFolioInstance.universityHoldingId);
          InventoryHoldings.deleteHoldingRecordViaApi(holdingInMarcInstance.universityHoldingId);
        });
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(sharedFolioInstance);
        InventoryInstance.deleteInstanceViaApi(sharedMarcInstance);
        Users.deleteViaApi(user.userId);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C566499 Handling permissions for Items edits from the Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C566499'] },
        () => {
          // Step 1: Build and run query - verify matched records
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          // Select Items — Affiliation Name field
          QueryModal.selectField(itemFieldValues.affiliationName);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect(tenantNames.college);
          QueryModal.chooseFromValueMultiselect(tenantNames.university);

          // Add Instances — Shared field
          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.instanceShared, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect('Shared', 1);

          QueryModal.addNewRow();
          QueryModal.selectField(itemFieldValues.instanceId, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 2);
          QueryModal.fillInValueTextfield(`${sharedFolioInstance}, ${sharedMarcInstance}`, 2);

          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.verifyNumberOfMatchedRecords(4);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            fileNames = BulkEditFiles.getAllQueryDownloadedFileNames(interceptedUuid, true);

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('4 item');

            allItemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
              );
            });

            // Step 2: Download matched records (CSV)
            BulkEditActions.downloadMatchedResults();

            allItemBarcodes.forEach((barcode) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.matchedRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
              );
            });

            // Step 3: Actions => Start bulk edit
            BulkEditActions.openStartBulkEditForm();
            BulkEditActions.verifyBulkEditsAccordionExists();
            BulkEditActions.verifyRowIcons();

            // Step 4: Select options/actions to modify Items
            BulkEditActions.addItemNoteAndVerify('Administrative note', newItemNote);
            BulkEditActions.verifyConfirmButtonDisabled(false);

            // Step 5: Click "Confirm changes"
            BulkEditActions.confirmChanges();
            BulkEditActions.verifyMessageBannerInAreYouSureForm(4);

            allItemBarcodes.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                newItemNote,
              );
            });

            // Step 6: Download preview CSV
            BulkEditActions.downloadPreview();

            allItemIds.forEach((itemId) => {
              BulkEditFiles.verifyValueInRowByUUID(
                fileNames.previewRecordsCSV,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                itemId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ADMINISTRATIVE_NOTE,
                newItemNote,
              );
            });

            // Step 7: Commit changes - verify permission errors
            BulkEditActions.commitChanges();
            BulkEditSearchPane.waitFileUploading();
            BulkEditActions.verifySuccessBanner(0);

            BulkEditSearchPane.verifyErrorLabel(4);
            BulkEditSearchPane.verifyShowWarningsCheckbox(true, false);
            BulkEditSearchPane.verifyPaginatorInErrorsAccordion(4);

            // Step 8-10: Check error table with permission errors
            const errorMessageTemplateCollege = (itemId) => {
              return `User ${user.username} does not have required permission to edit the item record - id=${itemId} on the tenant ${Affiliations.College.toLowerCase()}`;
            };
            const errorMessageTemplateUniversity = (itemId) => {
              return `User ${user.username} does not have required permission to edit the item record - id=${itemId} on the tenant ${Affiliations.University.toLowerCase()}`;
            };

            BulkEditSearchPane.verifyErrorByIdentifier(
              itemInFolioInstance.collegeItemId,
              errorMessageTemplateCollege(itemInFolioInstance.collegeItemId),
            );
            BulkEditSearchPane.verifyErrorByIdentifier(
              itemInMarcInstance.collegeItemId,
              errorMessageTemplateCollege(itemInMarcInstance.collegeItemId),
            );
            BulkEditSearchPane.verifyErrorByIdentifier(
              itemInFolioInstance.universityItemId,
              errorMessageTemplateUniversity(itemInFolioInstance.universityItemId),
            );
            BulkEditSearchPane.verifyErrorByIdentifier(
              itemInMarcInstance.universityItemId,
              errorMessageTemplateUniversity(itemInMarcInstance.universityItemId),
            );

            // Step 11: Download errors (CSV)
            BulkEditActions.openActions();
            BulkEditActions.downloadErrors();

            ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
              `ERROR,${itemInFolioInstance.collegeItemId},${errorMessageTemplateCollege(itemInFolioInstance.collegeItemId)}`,
              `ERROR,${itemInMarcInstance.collegeItemId},${errorMessageTemplateCollege(itemInMarcInstance.collegeItemId)}`,
              `ERROR,${itemInFolioInstance.universityItemId},${errorMessageTemplateUniversity(itemInFolioInstance.universityItemId)}`,
              `ERROR,${itemInMarcInstance.universityItemId},${errorMessageTemplateUniversity(itemInMarcInstance.universityItemId)}`,
            ]);
            BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 4);

            // Step 12: Switch to College tenant and verify changes NOT applied
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

            collegeItemBarcodes.forEach((barcode) => {
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.searchByParameter('Barcode', barcode);
              ItemRecordView.waitLoading();
              ItemRecordView.checkItemAdministrativeNote('-');
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });

            // Step 13: Switch to University tenant and verify changes NOT applied
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);

            universityItemBarcodes.forEach((barcode) => {
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.searchByParameter('Barcode', barcode);
              ItemRecordView.waitLoading();
              ItemRecordView.checkItemAdministrativeNote('-');
              ItemRecordView.closeDetailView();
              InventorySearchAndFilter.resetAll();
            });
          });
        },
      );
    });
  });
});
