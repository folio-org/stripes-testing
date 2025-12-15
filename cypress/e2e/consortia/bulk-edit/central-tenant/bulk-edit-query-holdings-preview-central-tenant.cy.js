import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../../support/constants';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

let user;
let instanceTypeId;
let locationId;
let sourceId;

// Test data objects for instances
const folioInstance = {
  title: `AT_C503016_FolioInstance_${getRandomPostfix()}`,
  holdingIdsCollege: [],
  holdingIdsUniversity: [],
  holdingHridsCollege: [],
  holdingHridsUniversity: [],
  instanceHrid: null,
  uuid: null,
};

const defaultPerms = [
  permissions.bulkEditView.gui,
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
];

// Matched records file names - will be set dynamically
let matchedRecordsQueryFileHoldingsUUID;
let matchedRecordsQueryFileHoldingsHRID;
let matchedRecordsQueryFileInstanceUUID;
let errorsFileHoldingsUUID;

// Error message templates
const errorNoPermissionTemplate = (holdingId) => `User ${user.username} does not have required permission to view the holdings record - id=${holdingId} on the tenant ${Affiliations.University.toLowerCase()}`;

const createHoldingsForTenant = ({ holdingIdsArray, holdingHridsArray, numberOfHoldings = 2 }) => {
  const createHoldingRecord = () => {
    return InventoryHoldings.createHoldingRecordViaApi({
      instanceId: folioInstance.uuid,
      permanentLocationId: locationId,
      sourceId,
    }).then((holding) => {
      holdingIdsArray.push(holding.id);
      holdingHridsArray.push(holding.hrid);
    });
  };

  // Create holdings sequentially using recursive chaining
  const createMultipleHoldings = (count) => {
    if (count === 0) {
      return cy.wrap(null);
    }
    return createMultipleHoldings(count - 1).then(() => createHoldingRecord());
  };

  return createMultipleHoldings(numberOfHoldings);
};

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser(defaultPerms).then((userProperties) => {
          user = userProperties;

          // Assign affiliations to user
          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: defaultPerms,
            });
          });

          // Get instance type, location, and source
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });

          // Create shared folio instance
          cy.resetTenant()
            .then(() => InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstance.title,
              },
            }))
            .then((createdInstanceData) => {
              folioInstance.uuid = createdInstanceData.instanceId;

              cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                folioInstance.instanceHrid = instance.hrid;
              });
            })
            .then(() => {
              // Create holdings in College tenant
              cy.setTenant(Affiliations.College);
            })
            .then(() => createHoldingsForTenant({
              holdingIdsArray: folioInstance.holdingIdsCollege,
              holdingHridsArray: folioInstance.holdingHridsCollege,
              numberOfHoldings: 3,
            }))
            .then(() => {
              // Create holdings in University tenant (more than 10 holdings for Instance UUID test)
              cy.setTenant(Affiliations.University);
            })
            .then(() => createHoldingsForTenant({
              holdingIdsArray: folioInstance.holdingIdsUniversity,
              holdingHridsArray: folioInstance.holdingHridsUniversity,
              numberOfHoldings: 11,
            }))
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete holdings in College tenant
        cy.setTenant(Affiliations.College);
        folioInstance.holdingIdsCollege.forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });

        // Delete holdings in University tenant
        cy.setTenant(Affiliations.University);
        folioInstance.holdingIdsUniversity.forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });

        // Delete instance in central tenant
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);

        // Clean up user and files
        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileHoldingsUUID,
          matchedRecordsQueryFileHoldingsHRID,
          matchedRecordsQueryFileInstanceUUID,
          errorsFileHoldingsUUID,
        );
      });

      it(
        'C503016 Query - Verify "Preview of record matched" when querying by valid Holdings identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503016'] },
        () => {
          cy.intercept('GET', '/query/**').as('query');
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('preview');
          cy.intercept('GET', '**/errors?limit=10&offset=0&errorType=ERROR').as('errors');

          // Step 1: Build query for Holdings UUIDs
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 2: Fill in Holdings UUIDs with "in" operator
          const holdingsUUIDs = [
            ...folioInstance.holdingIdsCollege,
            ...folioInstance.holdingIdsUniversity,
          ].join(',');
          QueryModal.selectField(holdingsFieldValues.holdingsUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(holdingsUUIDs);
          QueryModal.verifyQueryAreaContent(
            `(holdings.id in (${holdingsUUIDs.replace(/,/g, ', ')}))`,
          );
          QueryModal.testQueryDisabled(false);

          // Step 3: Test query
          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(14);
          QueryModal.runQueryDisabled(false);

          // Step 4: Run query
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileHoldingsUUID = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(holdings.id in (${holdingsUUIDs.replace(/,/g, ', ')}))`,
            );
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(14);
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

            // Step 5: Verify matched Holdings records (enable UUID column)
            BulkEditSearchPane.changeShowColumnCheckbox(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
            );

            folioInstance.holdingIdsCollege.forEach((holdingId) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                holdingId,
              );
            });

            folioInstance.holdingIdsUniversity.forEach((holdingId) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                holdingId,
              );
            });

            // Step 6-7: Verify Actions menu and Member column
            BulkEditActions.openActions();
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

            // Step 7: Check checkbox next to the "Member" column name under "Show columns"
            BulkEditSearchPane.changeShowColumnCheckbox(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
            );

            folioInstance.holdingHridsCollege.forEach((hrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                tenantNames.college,
              );
            });
            folioInstance.holdingHridsUniversity.forEach((hrid) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                hrid,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.MEMBER,
                tenantNames.university,
              );
            });

            // Step 8: Download and verify matched records CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            folioInstance.holdingIdsCollege
              .concat(folioInstance.holdingIdsUniversity)
              .forEach((holdingId) => {
                BulkEditFiles.verifyValueInRowByUUID(
                  matchedRecordsQueryFileHoldingsUUID,
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                  holdingId,
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                  holdingId,
                );
              });
          });

          // Step 9-10: Query by Holdings HRID
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 10: Fill in Holdings HRID with "equals" operator
          const holdingHRID = folioInstance.holdingHridsCollege[0];
          QueryModal.selectField(holdingsFieldValues.holdingsHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(holdingHRID);
          QueryModal.verifyQueryAreaContent(`(holdings.hrid == ${holdingHRID})`);
          QueryModal.testQueryDisabled(false);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(1);
          QueryModal.runQueryDisabled(false);

          // Step 11: Click "Run query" button
          // Check the Preview of record matched on "Bulk edit query" page
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception2) => {
            const interceptedUuid2 = interception2.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileHoldingsHRID = `*-Matched-Records-Query-${interceptedUuid2}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(`(holdings.hrid == ${holdingHRID})`);
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

            // Step 12: Verify matched Holdings HRID
            BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHRID,
            );

            // Step 13: Download and verify HRID matched records CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileHoldingsHRID, [holdingHRID]);
            BulkEditFiles.verifyValueInRowByUUID(
              matchedRecordsQueryFileHoldingsHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHRID,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
              holdingHRID,
            );
          });

          // Step 14-15: Query by Instance UUID (10+ holdings)
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(holdingsFieldValues.instanceUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(folioInstance.uuid);
          QueryModal.verifyQueryAreaContent(`(holdings.instance_id == ${folioInstance.uuid})`);
          QueryModal.testQueryDisabled(false);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(14); // Total: 3 College + 11 University
          QueryModal.runQueryDisabled(false);

          // Step 15: Run query
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception3) => {
            const interceptedUuid3 = interception3.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileInstanceUUID = `*-Matched-Records-Query-${interceptedUuid3}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(holdings.instance_id == ${folioInstance.uuid})`,
            );
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(14);
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

            // Step 16: Verify matched Holdings by Instance UUID
            folioInstance.holdingIdsCollege
              .concat(folioInstance.holdingIdsUniversity)
              .forEach((holdingId) => {
                BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                  holdingId,
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                  holdingId,
                );
              });

            // Step 17: Download and verify Instance UUID matched records CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileInstanceUUID, [
              folioInstance.holdingIdsCollege[0],
            ]);
            folioInstance.holdingIdsCollege
              .concat(folioInstance.holdingIdsUniversity)
              .forEach((holdingId) => {
                BulkEditFiles.verifyValueInRowByUUID(
                  matchedRecordsQueryFileInstanceUUID,
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                  holdingId,
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                  holdingId,
                );
              });
          });

          // Step 18-20: Remove University affiliation, verify only College holdings matched
          cy.logout();
          cy.getAdminToken();
          cy.removeAffiliationFromUser(Affiliations.University, user.userId);
          cy.resetTenant();

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          // Step 19: Repeat query by Holdings UUIDs
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(holdingsFieldValues.holdingsUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(holdingsUUIDs);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(3); // Only College holdings

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then(() => {
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('3 holdings');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(3);

            // Step 20: Verify only College holdings matched
            folioInstance.holdingIdsCollege.forEach((holdingId) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                holdingId,
              );
            });
          });

          // Step 21-23: Restore University affiliation, remove permissions, verify only College holdings
          cy.logout();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.University);
          cy.updateCapabilitiesForUserApi(user.userId, []);
          cy.updateCapabilitySetsForUserApi(user.userId, []);
          cy.resetTenant();

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          // Step 22: Repeat query by Holdings UUIDs
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(holdingsFieldValues.holdingsUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(holdingsUUIDs);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(3); // Only College holdings

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then(() => {
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('3 holdings');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(3);

            // Step 23: Verify only College holdings matched
            folioInstance.holdingIdsCollege.forEach((holdingId) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingId,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                holdingId,
              );
            });
          });

          // Step 24-27: Remove College affiliation, add limited permissions to University, verify errors
          cy.logout();
          cy.getAdminToken();
          cy.removeAffiliationFromUser(Affiliations.College, user.userId);

          // Add limited permissions to University (no view permission)
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(
            user.userId,
            [],
            [
              CapabilitySets.uiInventoryHoldingsCreate,
              CapabilitySets.uiBulkEditQueryExecute,
              CapabilitySets.uiBulkEditLogsView,
            ],
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          // Step 25: Repeat query by Holdings UUIDs
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(holdingsFieldValues.holdingsUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(holdingsUUIDs);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(11);
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@errors', getLongDelay()).then((interception6) => {
            const interceptedUuid6 = interception6.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/errors/,
            )[1];
            errorsFileHoldingsUUID = `*-Matching-Records-Errors-Query-${interceptedUuid6}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(holdings.id in (${holdingsUUIDs.replace(/,/g, ', ')}))`,
            );
            BulkEditSearchPane.verifyErrorLabel(11);

            // Step 26: Verify permission errors (top 10 visible)
            BulkEditSearchPane.verifyVisibleErrors(
              folioInstance.holdingIdsUniversity,
              errorNoPermissionTemplate,
              10,
            );

            // Step 27: Download and verify errors CSV (all 11 errors)
            BulkEditActions.openActions();
            BulkEditActions.downloadErrors();

            // Build expected error messages for all holdings
            const expectedErrors = folioInstance.holdingIdsUniversity.map(
              (holdingId) => `ERROR,${holdingId},${errorNoPermissionTemplate(holdingId)}`,
            );

            ExportFile.verifyFileIncludes(errorsFileHoldingsUUID, expectedErrors);
          });
        },
      );
    });
  });
});
