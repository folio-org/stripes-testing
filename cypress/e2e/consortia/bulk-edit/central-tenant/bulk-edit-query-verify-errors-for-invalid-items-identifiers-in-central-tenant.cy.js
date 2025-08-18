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
let invalidIdentifiers;
let matchedRecordsFileName;
const sharedItemBarcode = `shared-barcode-${getRandomPostfix()}`;
const sharedAccessionNumber = `shared-accession-${getRandomPostfix()}`;
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
  permissions.bulkEditQueryView.gui,
];
const tenants = [Affiliations.College, Affiliations.University];
const instances = [
  { title: `AT_C503032_FolioInstanceWithHoldingsAndItems_${getRandomPostfix()}` },
  {
    title: `AT_C503032_FolioInstanceWithHoldingsOnly_${getRandomPostfix()}`,
  },
];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          tenants.forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: userPermissions,
            });
          });

          // Create two shared instances in Central tenant
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;

              instances.forEach((instance) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instance.title,
                  },
                }).then((createdInstanceData) => {
                  instance.id = createdInstanceData.instanceId;
                });
              });
            })
            .then(() => {
              instances.forEach((instance) => {
                // Create holdings for shared instances in College and University tenants
                tenants.forEach((affiliation) => {
                  cy.setTenant(affiliation);
                  cy.getLocations({ limit: 1 }).then((locations) => {
                    locationId = locations.id;
                  });
                  InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                    sourceId = folioSource.id;

                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instance.id,
                      permanentLocationId: locationId,
                      sourceId,
                    }).then((holdingData) => {
                      if (affiliation === Affiliations.College) {
                        instance.collegeHolding = holdingData;
                      } else if (affiliation === Affiliations.University) {
                        instance.universityHolding = holdingData;
                      }
                    });
                  });
                });
              });
            })
            .then(() => {
              // Create items in College and University tenants for first instance
              [instances[0].collegeHolding.id, instances[0].universityHolding.id].forEach(
                (holdingId, ind) => {
                  cy.setTenant(tenants[ind]);
                  cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                    (loanTypes) => {
                      loanTypeId = loanTypes[0].id;
                    },
                  );
                  cy.getMaterialTypes({ limit: 1 })
                    .then((materialTypes) => {
                      materialTypeId = materialTypes.id;
                    })
                    .then(() => {
                      InventoryItems.createItemViaApi({
                        barcode: sharedItemBarcode,
                        accessionNumber: sharedAccessionNumber,
                        holdingsRecordId: holdingId,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      }).then((itemData) => {
                        if (tenants[ind] === Affiliations.College) {
                          instances[0].collegeItem = itemData;
                        } else if (tenants[ind] === Affiliations.University) {
                          instances[0].universityItem = itemData;
                        }
                      });
                    });
                },
              );
            })
            .then(() => {
              // Generate all invalid identifiers
              invalidIdentifiers = {
                item: {
                  uuids: [uuid(), uuid(), uuid()].join(','),
                  hrid: `invalid-item-hrid-${getRandomPostfix()}`,
                },
                holdings: {
                  uuids: [
                    instances[1].collegeHolding.id,
                    instances[1].universityHolding.id,
                    uuid(),
                  ].join(','),
                  hrid: `invalid-holdings-hrid-${getRandomPostfix()}`,
                },
                instance: {
                  uuids: [instances[1].instanceId, uuid(), uuid()].join(','),
                  hrid: `invalid-instance-hrid-${getRandomPostfix()}`,
                },
              };

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
        cy.setTenant(Affiliations.College);
        InventoryItems.deleteItemViaApi(instances[0].collegeItem.id);

        instances.forEach((instance) => {
          InventoryHoldings.deleteHoldingRecordViaApi(instance.collegeHolding.id);
        });

        cy.setTenant(Affiliations.University);
        InventoryItems.deleteItemViaApi(instances[0].universityItem.id);

        instances.forEach((instance) => {
          InventoryHoldings.deleteHoldingRecordViaApi(instance.universityHolding.id);
        });

        cy.resetTenant();

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });

        Users.deleteViaApi(user.userId);
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

            // Step 5: Check the matched Item records in the table under "Preview of record matched" accordion
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instances[0].collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instances[0].universityItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.university,
            );

            // Step 6: Click "Actions" menu => Click "Download matched records (CSV)" element
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();

            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              instances[0].collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              instances[0].universityItem.id,
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
          QueryModal.fillInValueTextfield(invalidIdentifiers.item.uuids);
          QueryModal.testQuery();
          QueryModal.verifyNumberOfMatchedRecords(0);
          QueryModal.runQueryDisabled();

          // Step 9: Test Items — Items — Item HRID field with invalid HRID
          QueryModal.selectField(itemFieldValues.itemHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(invalidIdentifiers.item.hrid);
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
              instances[0].collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              instances[0].universityItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.university,
            );

            // Step 13: Click "Actions" menu => Click "Download matched records (CSV)" element
            BulkEditActions.downloadMatchedResults();
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              instances[0].collegeItem.id,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
              tenantNames.college,
            );
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsFileName,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
              instances[0].universityItem.id,
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
            QueryModal.fillInValueTextfield(invalidIdentifiers.holdings.uuids);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();

            // Step 15: Test Items — Holdings — HRID field with invalid Holdings HRID
            QueryModal.selectField(itemFieldValues.holdingsHrid);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(invalidIdentifiers.holdings.hrid);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();

            // Step 16: Test Items — Instances — Instance UUID field with invalid Instance UUIDs
            QueryModal.selectField(itemFieldValues.instanceId);
            QueryModal.selectOperator(QUERY_OPERATIONS.IN);
            QueryModal.fillInValueTextfield(invalidIdentifiers.instance.uuids);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();

            // Step 17: Test Items — Instances — Instances HRID field with invalid Instance HRID
            QueryModal.selectField(itemFieldValues.instanceHrid);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(invalidIdentifiers.instance.hrid);
            QueryModal.testQuery();
            QueryModal.verifyNumberOfMatchedRecords(0);
            QueryModal.runQueryDisabled();
          });
        },
      );
    });
  });
});
