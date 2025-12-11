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
const errorNoPermissionTemplate = (holdingId) => `User ${user.username} does not have required permission to view the holdings record - id=${holdingId} on the tenant ${Affiliations.College.toLowerCase()}`;

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
          cy.log('=== STEPS 1-4: Query by Holdings UUIDs ===');
          // Step 1: Select "Inventory - holdings" radio button under "Record types" accordion
          // Click "Build query" button
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.cancelDisabled(false);
          QueryModal.runQueryDisabled();

          // Step 2: Select "Holdings — UUID" field, Select "in" operator
          // In "Value" text box type prepared in Preconditions Holdings UUIDs separated by a comma
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

          // Step 3: Click "Test query" button
          // Preview of the matched records is displayed with matched Holdings records
          // The number of matched records is correct
          // "Run query" button becomes enabled
          cy.intercept('GET', '/query/**').as('waiterForQueryCompleted');
          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@waiterForQueryCompleted');
          QueryModal.verifyNumberOfMatchedRecords(14);
          QueryModal.runQueryDisabled(false);

          // Step 4: Click "Run query" button
          // Check the Preview of record matched on "Bulk edit query" page
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@getPreview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileHoldingsUUID = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            // The "Build query" form closes
            // The "Bulk edit query" pane includes the following elements:
            // "Bulk edit query" pane name with the icon
            // "<count> holdings records matched" text with correct number of matched records from both member tenants
            // Built query next to "Query:" label
            // The "Preview of record matched" accordion shows a table populated with matched Holdings records
            // Paginator is displayed at the bottom of "Preview of record matched"
            // "Actions" menu (enabled)
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 holdings');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(holdings.id in (${holdingsUUIDs.replace(/,/g, ', ')}))`,
            );
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(14);
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

            cy.log('=== STEP 5: Verify matched Holdings records in table ===');
            // Step 5: Check the matched Holdings records in the table under "Preview of record matched" accordion
            // The table contains matched records from member-1 and member-2 tenants populated with appropriate Holdings records values
            // Enable Holdings UUID column (hidden by default)
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

            cy.log('=== STEP 6-7: Verify Actions menu and Member column ===');
            // Step 6: Click "Actions" menu
            // The "Actions" menu shows the following options:
            // "Download matched records (CSV)"
            // Under "Show columns":
            // Search box with placeholder "Search column name"
            // Scrollable list of available columns name (columns already displayed in "Preview of record matched" table have a checked checkbox)
            BulkEditActions.openActions();
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

            // Step 7: Check checkbox next to the "Member" column name under "Show columns"
            // Checkbox is checked next to the "Member" column name under "Show columns"
            // "Member" column is displayed in the table with matched Holdings records under "Preview of record matched" accordion populated with tenant name
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

            cy.log('=== STEP 8: Download and verify matched records CSV ===');
            // Step 8: Click "Actions" menu => Click "Download matched records (CSV)" element
            // The .csv file with all valid matched records is saved to the local machine with the name <yyyy-mm-dd-Matched-Records-Query-<bulk-edit-job-id>.csv
            // The file contains matched records from member-1 and member-2 tenants populated with appropriate Holdings records values
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

            cy.log('=== STEPS 9-10: Query by Holdings HRID ===');
            // Step 9: Click "Bulk edit" button in the header
            // Click "Query" tab
            // Select "Inventory - holdings" radio button under "Record types" accordion
            // Click "Build query" button
            BulkEditSearchPane.clickToBulkEditMainButton();
            BulkEditSearchPane.openQuerySearch();
            BulkEditSearchPane.checkHoldingsRadio();
            BulkEditSearchPane.clickBuildQueryButton();
            QueryModal.verify();
            QueryModal.cancelDisabled(false);
            QueryModal.runQueryDisabled();

            // Step 10: Select "Holding — HRID" field, Select "equals" operator
            // In "Value" text box type prepared in Preconditions Holdings HRID
            // Click "Test query" button
            const holdingHRID = folioInstance.holdingHridsCollege[0];
            QueryModal.selectField(holdingsFieldValues.holdingsHrid);
            QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
            QueryModal.fillInValueTextfield(holdingHRID);
            QueryModal.verifyQueryAreaContent(`(holdings.hrid == ${holdingHRID})`);
            QueryModal.testQueryDisabled(false);

            cy.intercept('GET', '/query/**').as('waiterForQueryCompleted2');
            QueryModal.testQuery();
            QueryModal.waitForQueryCompleted('@waiterForQueryCompleted2');
            QueryModal.verifyNumberOfMatchedRecords(1);
            QueryModal.runQueryDisabled(false);

            // Step 11: Click "Run query" button
            // Check the Preview of record matched on "Bulk edit query" page
            cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview2');
            QueryModal.clickRunQuery();
            QueryModal.verifyClosed();

            cy.wait('@getPreview2', getLongDelay()).then((interception2) => {
              const interceptedUuid2 = interception2.request.url.match(
                /bulk-operations\/([a-f0-9-]+)\/preview/,
              )[1];
              matchedRecordsQueryFileHoldingsHRID = `*-Matched-Records-Query-${interceptedUuid2}.csv`;

              // The "Build query" form closes
              // The "Bulk edit query" pane includes the following elements
              BulkEditSearchPane.verifyBulkEditQueryPaneExists();
              BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 holdings');
              BulkEditSearchPane.verifyQueryHeadLine(`(holdings.hrid == ${holdingHRID})`);
              BulkEditSearchPane.verifyPaginatorInMatchedRecords(1);
              BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

              cy.log('=== STEP 12: Verify matched Holdings HRID in table ===');
              // Step 12: Check the matched Holdings records in the table under "Preview of record matched" accordion
              // The table contains matched records from member tenants populated with appropriate Holdings records values
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                holdingHRID,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHRID,
              );

              cy.log('=== STEP 13: Download and verify HRID matched records CSV ===');
              // Step 13: Click "Actions" menu => Click "Download matched records (CSV)" element
              // The .csv file with all valid matched records is saved to the local machine
              BulkEditActions.openActions();
              BulkEditActions.downloadMatchedResults();
              BulkEditFiles.verifyValueInRowByUUID(
                matchedRecordsQueryFileHoldingsHRID,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHRID,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
                holdingHRID,
              );

              cy.log('=== STEPS 14-15: Query by Instance UUID (10+ holdings) ===');
              // Step 14: Repeat Step 8 (Navigate back to Query tab)
              // Select "Holding — Instance UUID" field, Select "equals" operator
              // In "Value" text box type prepared in Preconditions Instance UUID (one Instance with more than 10 Holdings)
              // Click "Test query" button
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

              cy.intercept('GET', '/query/**').as('waiterForQueryCompleted3');
              QueryModal.testQuery();
              QueryModal.waitForQueryCompleted('@waiterForQueryCompleted3');
              // Total holdings = 3 (College) + 11 (University) = 14
              QueryModal.verifyNumberOfMatchedRecords(14);
              QueryModal.runQueryDisabled(false);

              // Step 15: Click "Run query" button
              // Check the Preview of record matched on "Bulk edit query" page
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview3');
              QueryModal.clickRunQuery();
              QueryModal.verifyClosed();

              cy.wait('@getPreview3', getLongDelay()).then((interception3) => {
                const interceptedUuid3 = interception3.request.url.match(
                  /bulk-operations\/([a-f0-9-]+)\/preview/,
                )[1];
                matchedRecordsQueryFileInstanceUUID = `*-Matched-Records-Query-${interceptedUuid3}.csv`;

                // The "Build query" form closes
                // The "Bulk edit query" pane includes the following elements
                BulkEditSearchPane.verifyBulkEditQueryPaneExists();
                BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 holdings');
                BulkEditSearchPane.verifyQueryHeadLine(
                  `(holdings.instance_id == ${folioInstance.uuid})`,
                );
                BulkEditSearchPane.verifyPaginatorInMatchedRecords(14);
                BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);

                cy.log('=== STEP 16: Verify matched Holdings by Instance UUID ===');
                // Step 16: Check the matched Holdings records in the table under "Preview of record matched" accordion
                // The table contains matched records from member-1 and member-2 tenants populated with appropriate Holdings records values
                // Enable Holdings UUID column (hidden by default)

                folioInstance.holdingIdsCollege
                  .concat(folioInstance.holdingIdsUniversity)
                  .forEach((holdingId) => {
                    BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                      holdingId,
                      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                      holdingId,
                    );
                  });

                cy.log('=== STEP 17: Download and verify Instance UUID matched records CSV ===');
                // Step 17: Click "Actions" menu => Click "Download matched records (CSV)" element
                // The .csv file with all valid matched records is saved to the local machine
                BulkEditActions.openActions();
                BulkEditActions.downloadMatchedResults();
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

                cy.log('=== STEPS 18-20: Test affiliation removal scenario ===');
                // Step 18: Remove User's affiliation in member-1 tenant
                // Relogin in central tenant and open "Bulk edit" app, "Query" tab
                cy.logout();
                cy.getAdminToken();
                cy.removeAffiliationFromUser(Affiliations.College, user.userId);
                cy.resetTenant();

                cy.login(user.username, user.password, {
                  path: TopMenu.bulkEditPath,
                  waiter: BulkEditSearchPane.waitLoading,
                });

                // Step 19: Repeat Steps 1-4
                // Check the Preview of record matched on "Bulk edit query" page
                BulkEditSearchPane.openQuerySearch();
                BulkEditSearchPane.checkHoldingsRadio();
                BulkEditSearchPane.clickBuildQueryButton();
                QueryModal.verify();

                QueryModal.selectField(holdingsFieldValues.holdingsUuid);
                QueryModal.selectOperator(QUERY_OPERATIONS.IN);
                QueryModal.fillInValueTextfield(holdingsUUIDs);

                cy.intercept('GET', '/query/**').as('waiterForQueryCompleted4');
                QueryModal.testQuery();
                QueryModal.waitForQueryCompleted('@waiterForQueryCompleted4');
                // Only University holdings should match (11 holdings)
                QueryModal.verifyNumberOfMatchedRecords(11);

                cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview4');
                QueryModal.clickRunQuery();
                QueryModal.verifyClosed();

                cy.wait('@getPreview4', getLongDelay()).then(() => {
                  // The "Bulk edit query" pane includes the following elements
                  // "<count> holdings records matched" text with correct number of matched records from member-2 tenant
                  BulkEditSearchPane.verifyBulkEditQueryPaneExists();
                  BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('11 holdings');
                  BulkEditSearchPane.verifyPaginatorInMatchedRecords(11);

                  cy.log(
                    '=== STEP 20: Verify only University holdings matched (no College affiliation) ===',
                  );
                  // Step 20: Check the matched Holdings records in the table under "Preview of record matched" accordion
                  // The table contains matched records from member-2 tenant populated with appropriate Holdings records values
                  // Enable Holdings UUID column (hidden by default)

                  folioInstance.holdingIdsUniversity.forEach((holdingId) => {
                    BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                      holdingId,
                      BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                      holdingId,
                    );
                  });

                  cy.log('=== STEPS 21-23: Test permission removal scenario ===');
                  // Step 21: Assign back User's affiliation in member-1 tenant
                  // Remove User's permissions in member-1 tenant
                  // Relogin in central tenant and open "Bulk edit" app, "Query" tab

                  cy.logout();
                  cy.getAdminToken();
                  cy.assignAffiliationToUser(Affiliations.College, user.userId);
                  cy.setTenant(Affiliations.College);
                  cy.updateCapabilitiesForUserApi(user.userId, []);
                  cy.updateCapabilitySetsForUserApi(user.userId, []);
                  cy.resetTenant();

                  cy.login(user.username, user.password, {
                    path: TopMenu.bulkEditPath,
                    waiter: BulkEditSearchPane.waitLoading,
                  });

                  // Step 22: Repeat Steps 1-4
                  // Check the Preview of record matched on "Bulk edit query" page
                  BulkEditSearchPane.openQuerySearch();
                  BulkEditSearchPane.checkHoldingsRadio();
                  BulkEditSearchPane.clickBuildQueryButton();
                  QueryModal.verify();

                  QueryModal.selectField(holdingsFieldValues.holdingsUuid);
                  QueryModal.selectOperator(QUERY_OPERATIONS.IN);
                  QueryModal.fillInValueTextfield(holdingsUUIDs);

                  cy.intercept('GET', '/query/**').as('waiterForQueryCompleted5');
                  QueryModal.testQuery();
                  QueryModal.waitForQueryCompleted('@waiterForQueryCompleted5');
                  // Only University holdings should match (11 holdings)
                  QueryModal.verifyNumberOfMatchedRecords(11);

                  cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as(
                    'getPreview5',
                  );
                  QueryModal.clickRunQuery();
                  QueryModal.verifyClosed();

                  cy.wait('@getPreview5', getLongDelay()).then(() => {
                    // The "Bulk edit query" pane includes the following elements
                    BulkEditSearchPane.verifyBulkEditQueryPaneExists();
                    BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('11 holdings');
                    BulkEditSearchPane.verifyPaginatorInMatchedRecords(11);

                    cy.log(
                      '=== STEP 23: Verify only University holdings matched (no College permissions) ===',
                    );
                    // Step 23: Check the matched Holdings records in the table under "Preview of record matched" accordion
                    // The table contains matched records from member-2 tenant populated with appropriate Holdings records values
                    // Enable Holdings UUID column (hidden by default)

                    folioInstance.holdingIdsUniversity.forEach((holdingId) => {
                      BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                        holdingId,
                        BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_UUID,
                        holdingId,
                      );
                    });

                    cy.log('=== STEPS 24-27: Test insufficient permissions scenario ===');
                    // Step 24: Remove User's affiliation in member-2 tenant
                    // Add the following capability sets to User in member-1 tenant:
                    // data - UI-Inventory Holdings - create
                    // procedural - UI-Bulk-Edit Query - execute
                    // data - UI-Bulk-Edit Logs - view
                    // Relogin in central tenant and open "Bulk edit" app, "Query" tab
                    cy.logout();
                    cy.getAdminToken();
                    cy.removeAffiliationFromUser(Affiliations.University, user.userId);
                    cy.setTenant(Affiliations.College);
                    cy.updateCapabilitiesForUserApi(user.userId, []);
                    cy.updateCapabilitySetsForUserApi(user.userId, []);
                    cy.resetTenant();
                    cy.removeAffiliationFromUser(Affiliations.College, user.userId);

                    // Add limited permissions to College tenant
                    cy.affiliateUserToTenant({
                      tenantId: Affiliations.College,
                      userId: user.userId,
                      permissions: [
                        permissions.uiInventoryViewCreateHoldings.gui,
                        permissions.bulkEditQueryView.gui,
                        permissions.bulkEditLogsView.gui,
                      ],
                    });

                    cy.login(user.username, user.password, {
                      path: TopMenu.bulkEditPath,
                      waiter: BulkEditSearchPane.waitLoading,
                    });

                    // Step 25: Repeat Steps 1-4
                    // Check the Preview of record matched on "Bulk edit query" page
                    BulkEditSearchPane.openQuerySearch();
                    BulkEditSearchPane.checkHoldingsRadio();
                    BulkEditSearchPane.clickBuildQueryButton();
                    QueryModal.verify();

                    QueryModal.selectField(holdingsFieldValues.holdingsUuid);
                    QueryModal.selectOperator(QUERY_OPERATIONS.IN);
                    QueryModal.fillInValueTextfield(holdingsUUIDs);

                    cy.intercept('GET', '/query/**').as('waiterForQueryCompleted6');
                    QueryModal.testQuery();
                    QueryModal.waitForQueryCompleted('@waiterForQueryCompleted6');
                    // No holdings should match (0 holdings) - user doesn't have view permission
                    QueryModal.verifyNumberOfMatchedRecords(0);

                    cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as(
                      'getPreview6',
                    );
                    QueryModal.clickRunQuery();
                    QueryModal.verifyClosed();

                    cy.wait('@getPreview6', getLongDelay()).then((interception6) => {
                      const interceptedUuid6 = interception6.request.url.match(
                        /bulk-operations\/([a-f0-9-]+)\/preview/,
                      )[1];
                      errorsFileHoldingsUUID = `*-Matching-Records-Errors-Query-${interceptedUuid6}.csv`;

                      // The "Build query" form closes
                      // The "Bulk edit query" pane includes the following elements:
                      // "Bulk edit query" pane name with the icon
                      // "0 holdings records matched" text
                      // Built query next to "Query:" label
                      // The "Preview of record matched" accordion is absent
                      // The "Errors" accordion shows a table populated with Top 10 Errors for Holdings records
                      BulkEditSearchPane.verifyBulkEditQueryPaneExists();
                      BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 holdings');
                      BulkEditSearchPane.verifyQueryHeadLine(
                        `(holdings.id in (${holdingsUUIDs.replace(/,/g, ', ')}))`,
                      );
                      BulkEditSearchPane.verifyErrorLabel(14);

                      cy.log('=== STEP 26: Verify permission errors in table ===');
                      // Step 26: Check the table populated with Top 10 Errors
                      // The table contains:
                      // Record identifier - populated with Holdings UUID
                      // Reason for error - User <username> does not have required permission to view the holdings record
                      folioInstance.holdingIdsCollege
                        .concat(folioInstance.holdingIdsUniversity)
                        .slice(0, 10)
                        .forEach((holdingId) => {
                          BulkEditSearchPane.verifyErrorByIdentifier(
                            holdingId,
                            errorNoPermissionTemplate(holdingId),
                          );
                        });

                      cy.log('=== STEP 27: Download and verify errors CSV ===');
                      // Step 27: Click "Actions" menu => Click "Download errors (CSV)" option
                      // The .csv file with all errors is saved to the local machine
                      BulkEditActions.openActions();
                      BulkEditActions.downloadErrors();

                      // Build expected error messages for all holdings
                      const expectedErrors = folioInstance.holdingIdsCollege
                        .concat(folioInstance.holdingIdsUniversity)
                        .map(
                          (holdingId) => `ERROR,${holdingId},${errorNoPermissionTemplate(holdingId)}`,
                        );

                      ExportFile.verifyFileIncludes(errorsFileHoldingsUUID, expectedErrors);
                    });
                  });
                });
              });
            });
          });
        },
      );
    });
  });
});
