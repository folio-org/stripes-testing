import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import QueryModal, {
  QUERY_OPERATIONS,
  itemFieldValues,
} from '../../../../support/fragments/bulk-edit/query-modal';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import FileManager from '../../../../support/utils/fileManager';
import {
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
} from '../../../../support/constants';

let user;
let instanceTypeId;
let locationId;
let loanTypeId;
let materialTypeId;
let sourceId;
let centralInstance;
let centralInstanceWithHoldingsOnly;
let collegeHolding;
let universityHolding;
let collegeHoldingWithoutItems;
let universityHoldingWithoutItems;
let collegeItem;
let universityItem;
let invalidItemUuids;
let invalidItemHrid;
let invalidHoldingsUuids;
let invalidHoldingsHrid;
let invalidInstanceUuids;
let invalidInstanceHrid;
let sharedItemBarcode;
let sharedAccessionNumber;
let matchedRecordsFileName;
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
  permissions.bulkEditQueryView.gui,
];

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: userPermissions,
            });
          });

          // Get required IDs for instance and items creation
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            })
            .then(() => {
              // Generate shared identifiers for items that will match across tenants
              sharedItemBarcode = `shared-barcode-${getRandomPostfix()}`;
              sharedAccessionNumber = `shared-accession-${getRandomPostfix()}`;

              // Generate invalid identifiers
              invalidItemUuids = [uuid(), uuid(), uuid()].join(',');
              invalidItemHrid = `invalid-item-hrid-${getRandomPostfix()}`;
              invalidHoldingsUuids = [uuid(), uuid()].join(',');
              invalidHoldingsHrid = `invalid-holdings-hrid-${getRandomPostfix()}`;
              invalidInstanceUuids = [uuid(), uuid()].join(',');
              invalidInstanceHrid = `invalid-instance-hrid-${getRandomPostfix()}`;

              // Create FOLIO instance in central tenant
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: `AT_C503032_FolioInstance_${getRandomPostfix()}`,
                },
              }).then((createdInstanceData) => {
                centralInstance = createdInstanceData;

                // Create holding in College tenant
                cy.setTenant(Affiliations.College);
                cy.getLocations({ limit: 1 }).then((locations) => {
                  locationId = locations.id;
                });
                cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                  (loanTypes) => {
                    loanTypeId = loanTypes[0].id;
                  },
                );
                cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
                  materialTypeId = materialTypes.id;
                });
                InventoryHoldings.getHoldingsFolioSource()
                  .then((folioSource) => {
                    sourceId = folioSource.id;
                  })
                  .then(() => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: centralInstance.instanceId,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holdingData) => {
                      collegeHolding = holdingData;

                      // Create item in College tenant with shared barcode and accession number
                      InventoryItems.createItemViaApi({
                        barcode: sharedItemBarcode,
                        accessionNumber: sharedAccessionNumber,
                        holdingsRecordId: collegeHolding.id,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      }).then((itemData) => {
                        collegeItem = itemData;
                      });
                    });
                  });

                // Create holding in University tenant
                cy.setTenant(Affiliations.University);
                cy.getLocations({ limit: 1 }).then((locations) => {
                  locationId = locations.id;
                });
                cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                  (loanTypes) => {
                    loanTypeId = loanTypes[0].id;
                  },
                );
                cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
                  materialTypeId = materialTypes.id;
                });
                InventoryHoldings.getHoldingsFolioSource()
                  .then((folioSource) => {
                    sourceId = folioSource.id;
                  })
                  .then(() => {
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: centralInstance.instanceId,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holdingData) => {
                      universityHolding = holdingData;

                      // Create item in University tenant with same shared barcode and accession number
                      InventoryItems.createItemViaApi({
                        barcode: sharedItemBarcode,
                        accessionNumber: sharedAccessionNumber,
                        holdingsRecordId: universityHolding.id,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      }).then((itemData) => {
                        universityItem = itemData;
                      });
                    });
                  });
              });
            })
            .then(() => {
              cy.resetTenant();
              // Create second FOLIO instance in central tenant for holdings without items test
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: `AT_C503032_FolioInstanceWithHoldingsOnly_${getRandomPostfix()}`,
                },
              }).then((instanceData) => {
                centralInstanceWithHoldingsOnly = instanceData;

                // Create holding in College tenant (without items)
                cy.setTenant(Affiliations.College);
                cy.getLocations({ limit: 1 }).then((locations) => {
                  locationId = locations.id;

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: centralInstanceWithHoldingsOnly.instanceId,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holdingData) => {
                    collegeHoldingWithoutItems = holdingData;
                  });
                });

                // Create holding in University tenant (without items)
                cy.setTenant(Affiliations.University);
                cy.getLocations({ limit: 1 }).then((locations) => {
                  locationId = locations.id;

                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: centralInstanceWithHoldingsOnly.instanceId,
                    permanentLocationId: locationId,
                    sourceId,
                  }).then((holdingData) => {
                    universityHoldingWithoutItems = holdingData;

                    // Update invalidHoldingsUuids to include actual holdings UUIDs (which have no items)
                    invalidHoldingsUuids = [
                      collegeHoldingWithoutItems.id,
                      universityHoldingWithoutItems.id,
                      uuid(),
                    ].join(',');

                    // Update invalidInstanceUuids to include the instance with holdings but no items
                    invalidInstanceUuids = [
                      centralInstanceWithHoldingsOnly.instanceId,
                      uuid(),
                      uuid(),
                    ].join(',');
                  });
                });
              });

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              BulkEditSearchPane.openQuerySearch();
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Clean up items and holdings in College tenant
        cy.setTenant(Affiliations.College);
        InventoryItems.deleteItemViaApi(collegeItem.id);
        InventoryHoldings.deleteHoldingRecordViaApi(collegeHolding.id);
        InventoryHoldings.deleteHoldingRecordViaApi(collegeHoldingWithoutItems.id);

        // Clean up items and holdings in University tenant
        cy.setTenant(Affiliations.University);
        InventoryItems.deleteItemViaApi(universityItem.id);
        InventoryHoldings.deleteHoldingRecordViaApi(universityHolding.id);
        InventoryHoldings.deleteHoldingRecordViaApi(universityHoldingWithoutItems.id);

        // Clean up instances in central tenant
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(centralInstance.instanceId);
        InventoryInstance.deleteInstanceViaApi(centralInstanceWithHoldingsOnly.instanceId);

        // Clean up user
        Users.deleteViaApi(user.userId);

        // Clean up downloaded files
        FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
      });

      it(
        'C503032 Query - Verify "Errors" when querying by invalid Items identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503032'] },
        () => {
          // Step 1: Select "Inventory - items" radio button and click "Build query"
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 2-4: Test Items — Items — Barcode field with shared barcode (should find 2 matches)
          QueryModal.selectField(itemFieldValues.itemBarcode);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(sharedItemBarcode);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(2);

          // Set up interception to capture bulk operation UUID for file name
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          // Wait for preview and capture file name
          cy.wait('@getPreview').then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 item');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

            // Step 5: Check the matched Item records in the table under "Preview of record matched" accordion
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              universityItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.university,
            );

            // Step 6: Click "Actions" menu => Click "Download matched records (CSV)" element
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              universityItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.university,
            );

            FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
          });
          // Step 7-8: Test Items — Items — Item UUID field with invalid UUIDs
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.selectField(itemFieldValues.itemUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(invalidItemUuids);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          // ?????????????????????QueryModal.verifyShowColumnButtonDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 9: Test Items — Items — Item HRID field with invalid HRID
          QueryModal.selectField(itemFieldValues.itemHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(invalidItemHrid);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 10: Select "Items — Items — Accession number" field
          QueryModal.selectField(itemFieldValues.itemAccessionNumber);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(sharedAccessionNumber);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(2);

          // Step 11: Click "Run query" button
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview').then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsFileName = `*-Matched-Records-Query-${interceptedUuid}.csv`;
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('2 item');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(2);

            // Step 12: Check the matched Item records in the table under "Preview of record matched" accordion
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              universityItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.university,
            );

            // Step 13: Click "Actions" menu => Click "Download matched records (CSV)" element
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              universityItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.university,
            );

            // Step 14: Test Items — Holdings record UUID field with invalid Holdings UUIDs
            BulkEditSearchPane.clickToBulkEditMainButton();
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkItemsRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.selectField(itemFieldValues.holdingsId);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN);
            QueryModal.fillInValueTextfield(invalidHoldingsUuids);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();

            // Step 15: Test Items — Holdings — HRID field with invalid Holdings HRID
            QueryModal.selectField(itemFieldValues.holdingsHrid);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(invalidHoldingsHrid);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();

            // Step 16: Test Items — Instances — Instance UUID field with invalid Instance UUIDs
            QueryModal.selectField(itemFieldValues.instanceId);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN);
            QueryModal.fillInValueTextfield(invalidInstanceUuids);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();

            // Step 17: Test Items — Instances — Instances HRID field with invalid Instance HRID
            QueryModal.selectField(itemFieldValues.instanceHrid);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(invalidInstanceHrid);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();
          });
        },
      );
    });
  });
});
