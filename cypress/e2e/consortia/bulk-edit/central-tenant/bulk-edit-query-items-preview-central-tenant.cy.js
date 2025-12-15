import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { BULK_EDIT_TABLE_COLUMN_HEADERS, ITEM_STATUS_NAMES } from '../../../../support/constants';
import QueryModal, {
  itemFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let materialTypeId;
let loanTypeId;

const folioInstance = {
  title: `AT_C503022_FolioInstance_${getRandomPostfix()}`,
  holdingIdsCollege: [],
  holdingIdsUniversity: [],
  holdingHridsCollege: [],
  holdingHridsUniversity: [],
  itemIdsCollege: [],
  itemIdsUniversity: [],
  itemBarcodesCollege: [],
  itemBarcodesUniversity: [],
  itemHridsCollege: [],
  itemHridsUniversity: [],
  itemAccessionNumbersCollege: [],
  itemAccessionNumbersUniversity: [],
  instanceHrid: null,
  uuid: null,
};

const defaultPerms = [
  permissions.bulkEditView.gui,
  permissions.bulkEditQueryView.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
];

let matchedRecordsQueryFileItemBarcode;
let matchedRecordsQueryFileItemUUID;
let matchedRecordsQueryFileItemHRID;
let matchedRecordsQueryFileAccessionNumber;
let matchedRecordsQueryFileHoldingsUUID;
let matchedRecordsQueryFileHoldingsHRID;
let matchedRecordsQueryFileInstanceUUID;
let matchedRecordsQueryFileInstanceHRID;
let errorsFileItemUUID;

const barcodePrefix = `BC${getRandomPostfix()}`;
const accessionNumberPrefix = `ACC${getRandomPostfix()}`;

const createItemsForTenant = ({
  holdingId,
  itemIdsArray,
  itemBarcodesArray,
  itemHridsArray,
  itemAccessionNumbersArray,
  numberOfItems = 2,
  barcodeBase,
  accessionBase,
}) => {
  const createItemRecord = (index) => {
    const barcode = `${barcodeBase}-${index}`;
    const accessionNumber = `${accessionBase}-${index}`;

    return InventoryItems.createItemViaApi({
      barcode,
      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
      permanentLoanType: { id: loanTypeId },
      materialType: { id: materialTypeId },
      holdingsRecordId: holdingId,
      accessionNumber,
    }).then((item) => {
      itemIdsArray.push(item.id);
      itemBarcodesArray.push(item.barcode);
      itemHridsArray.push(item.hrid);
      itemAccessionNumbersArray.push(item.accessionNumber);
    });
  };

  const createMultipleItems = (count, currentIndex = 0) => {
    if (count === 0) {
      return cy.wrap(null);
    }
    return createMultipleItems(count - 1, currentIndex + 1).then(() => createItemRecord(currentIndex));
  };

  return createMultipleItems(numberOfItems);
};

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

        cy.createTempUser(defaultPerms).then((userProperties) => {
          user = userProperties;

          [Affiliations.College, Affiliations.University].forEach((affiliation) => {
            cy.affiliateUserToTenant({
              tenantId: affiliation,
              userId: user.userId,
              permissions: defaultPerms,
            });
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          });
          cy.getLocations({ query: 'name="DCB"' }).then((res) => {
            locationId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            loanTypeId = loanTypes[0].id;
          });
          cy.getDefaultMaterialType().then((materialTypes) => {
            materialTypeId = materialTypes.id;
          });

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
              cy.setTenant(Affiliations.College);
            })
            .then(() => InventoryHoldings.createHoldingRecordViaApi({
              instanceId: folioInstance.uuid,
              permanentLocationId: locationId,
              sourceId,
            }))
            .then((holding) => {
              folioInstance.holdingIdsCollege.push(holding.id);
              folioInstance.holdingHridsCollege.push(holding.hrid);

              return createItemsForTenant({
                holdingId: holding.id,
                itemIdsArray: folioInstance.itemIdsCollege,
                itemBarcodesArray: folioInstance.itemBarcodesCollege,
                itemHridsArray: folioInstance.itemHridsCollege,
                itemAccessionNumbersArray: folioInstance.itemAccessionNumbersCollege,
                numberOfItems: 3,
                barcodeBase: `${barcodePrefix}C`,
                accessionBase: `${accessionNumberPrefix}C`,
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
            })
            .then(() => InventoryHoldings.createHoldingRecordViaApi({
              instanceId: folioInstance.uuid,
              permanentLocationId: locationId,
              sourceId,
            }))
            .then((holding) => {
              folioInstance.holdingIdsUniversity.push(holding.id);
              folioInstance.holdingHridsUniversity.push(holding.hrid);

              return createItemsForTenant({
                holdingId: holding.id,
                itemIdsArray: folioInstance.itemIdsUniversity,
                itemBarcodesArray: folioInstance.itemBarcodesUniversity,
                itemHridsArray: folioInstance.itemHridsUniversity,
                itemAccessionNumbersArray: folioInstance.itemAccessionNumbersUniversity,
                numberOfItems: 11,
                barcodeBase: `${barcodePrefix}U`,
                accessionBase: `${accessionNumberPrefix}U`,
              });
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
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        folioInstance.itemIdsCollege.forEach((itemId) => {
          InventoryItems.deleteItemViaApi(itemId);
        });
        folioInstance.holdingIdsCollege.forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });

        cy.setTenant(Affiliations.University);
        folioInstance.itemIdsUniversity.forEach((itemId) => {
          InventoryItems.deleteItemViaApi(itemId);
        });
        folioInstance.holdingIdsUniversity.forEach((holdingId) => {
          cy.deleteHoldingRecordViaApi(holdingId);
        });

        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(folioInstance.uuid);

        Users.deleteViaApi(user.userId);
        FileManager.deleteFileFromDownloadsByMask(
          matchedRecordsQueryFileItemBarcode,
          matchedRecordsQueryFileItemUUID,
          matchedRecordsQueryFileItemHRID,
          matchedRecordsQueryFileAccessionNumber,
          matchedRecordsQueryFileHoldingsUUID,
          matchedRecordsQueryFileHoldingsHRID,
          matchedRecordsQueryFileInstanceUUID,
          matchedRecordsQueryFileInstanceHRID,
          errorsFileItemUUID,
        );
      });

      it(
        'C503022 Query - Verify "Preview of record matched" when querying by valid Items identifiers in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C503022'] },
        () => {
          // Step 1-4: Query by Item Barcode (starts with)
          cy.intercept('GET', '/query/**').as('query');
          cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('preview');
          cy.intercept('GET', '**/errors?limit=10&offset=0&errorType=ERROR').as('errors');

          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.itemBarcode);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(barcodePrefix);
          QueryModal.verifyQueryAreaContent(`(items.barcode starts with ${barcodePrefix})`);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(14);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileItemBarcode = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 item');
            BulkEditSearchPane.verifyPaginatorInMatchedRecords(14);

            // Step 5: Verify matched Item records
            BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
            BulkEditSearchPane.verifyCheckboxesInActionsDropdownMenuChecked(
              true,
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
            );

            folioInstance.itemBarcodesCollege.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
              );
            });

            folioInstance.itemBarcodesUniversity.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                barcode,
              );
            });

            // Step 6-7: Verify Member column
            BulkEditSearchPane.changeShowColumnCheckbox(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
            );

            folioInstance.itemBarcodesCollege.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.college,
              );
            });
            folioInstance.itemBarcodesUniversity.forEach((barcode) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                barcode,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MEMBER,
                tenantNames.university,
              );
            });

            // Step 8: Download CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileItemBarcode, [
              folioInstance.itemBarcodesCollege[0],
            ]);
            folioInstance.itemBarcodesCollege
              .concat(folioInstance.itemBarcodesUniversity)
              .forEach((barcode) => {
                BulkEditFiles.verifyValueInRowByUUID(
                  matchedRecordsQueryFileItemBarcode,
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                  barcode,
                  BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.BARCODE,
                  barcode,
                );
              });
          });

          // Step 9-12: Query by Item UUIDs
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          const itemUUIDs = [
            ...folioInstance.itemIdsCollege,
            ...folioInstance.itemIdsUniversity,
          ].join(',');
          QueryModal.selectField(itemFieldValues.itemUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(itemUUIDs);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(14);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception2) => {
            const interceptedUuid2 = interception2.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileItemUUID = `*-Matched-Records-Query-${interceptedUuid2}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 item');

            // Step 12: Verify and download
            BulkEditActions.openActions();
            BulkEditSearchPane.changeShowColumnCheckbox(
              BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
            );

            folioInstance.itemIdsCollege.concat(folioInstance.itemIdsUniversity).forEach((id) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                id,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                id,
              );
            });

            BulkEditActions.openActions();
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileItemUUID, [
              folioInstance.itemIdsCollege[0],
            ]);
          });

          // Step 13-15: Query by Item HRIDs
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.itemHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(folioInstance.itemHridsCollege[0]);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(1);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception3) => {
            const interceptedUuid3 = interception3.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileItemHRID = `*-Matched-Records-Query-${interceptedUuid3}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('1 item');

            // Step 15: Download CSV
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileItemHRID, [
              folioInstance.itemHridsCollege[0],
            ]);
          });

          // Step 16-18: Query by Accession number
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.itemAccessionNumber);
          QueryModal.selectOperator(QUERY_OPERATIONS.CONTAINS);
          QueryModal.fillInValueTextfield(accessionNumberPrefix);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(14);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileAccessionNumber = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 item');

            // Step 18: Download CSV
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileAccessionNumber, [
              folioInstance.itemAccessionNumbersCollege[0],
            ]);
          });

          // Step 19-21: Query by Holdings UUID (10+ items)
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.holdingsId);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(folioInstance.holdingIdsUniversity[0]);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(11);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileHoldingsUUID = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('11 item');

            // Step 21: Download CSV
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileHoldingsUUID, [
              folioInstance.itemIdsUniversity[0],
            ]);
          });

          // Step 22-24: Query by Holdings HRID
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.holdingsHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(folioInstance.holdingHridsCollege[0]);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(3);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileHoldingsHRID = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('3 item');

            // Step 24: Download CSV
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileHoldingsHRID, [
              folioInstance.itemIdsCollege[0],
            ]);
          });

          // Step 25-27: Query by Instance UUID
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.instanceId);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(folioInstance.uuid);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(14);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileInstanceUUID = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 item');

            // Step 27: Download CSV
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileInstanceUUID, [
              folioInstance.itemIdsCollege[0],
            ]);
          });

          // Step 28-30: Query by Instance HRID
          BulkEditSearchPane.clickToBulkEditMainButton();
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.instanceHrid);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(folioInstance.instanceHrid);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(14);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/preview/,
            )[1];
            matchedRecordsQueryFileInstanceHRID = `*-Matched-Records-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('14 item');

            // Step 30: Download CSV
            BulkEditActions.downloadMatchedResults();
            ExportFile.verifyFileIncludes(matchedRecordsQueryFileInstanceHRID, [
              folioInstance.itemIdsCollege[0],
            ]);
          });

          // Step 31-33: Remove College affiliation
          cy.logout();
          cy.getAdminToken();
          cy.removeAffiliationFromUser(Affiliations.College, user.userId);
          cy.resetTenant();

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          // Step 32: Repeat query by Item UUIDs
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.itemUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(itemUUIDs);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(11);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then(() => {
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('11 item');

            // Step 33: Verify only University items
            folioInstance.itemIdsUniversity.forEach((id) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                id,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                id,
              );
            });
          });

          // Step 34-36: Restore College, remove permissions
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

          // Step 35: Repeat query
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.itemUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(itemUUIDs);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(11);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@preview', getLongDelay()).then(() => {
            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('11 item');

            // Step 36: Verify only University items
            folioInstance.itemIdsUniversity.forEach((id) => {
              BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
                id,
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_UUID,
                id,
              );
            });
          });

          // Step 37-40: Remove College, add limited University permissions
          cy.logout();
          cy.getAdminToken();
          cy.removeAffiliationFromUser(Affiliations.College, user.userId);

          // Add limited permissions to University (no view permission)
          cy.setTenant(Affiliations.University);
          cy.updateCapabilitiesForUserApi(user.userId, []);
          cy.assignCapabilitiesToExistingUser(
            user.userId,
            [],
            [
              CapabilitySets.uiInventoryItemCreate,
              CapabilitySets.uiBulkEditQueryExecute,
              CapabilitySets.uiBulkEditLogsView,
            ],
          );

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          // Step 38: Repeat query
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();

          QueryModal.selectField(itemFieldValues.itemUuid);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(itemUUIDs);

          QueryModal.testQuery();
          QueryModal.waitForQueryCompleted('@query');
          QueryModal.verifyNumberOfMatchedRecords(11);

          QueryModal.clickRunQuery();
          QueryModal.verifyClosed();

          cy.wait('@errors', getLongDelay()).then((interception) => {
            const interceptedUuid = interception.request.url.match(
              /bulk-operations\/([a-f0-9-]+)\/errors/,
            )[1];
            errorsFileItemUUID = `*-Matching-Records-Errors-Query-${interceptedUuid}.csv`;

            BulkEditSearchPane.verifyBulkEditQueryPaneExists();
            BulkEditSearchPane.verifyRecordsCountInBulkEditQueryPane('0 item');
            BulkEditSearchPane.verifyQueryHeadLine(
              `(items.id in (${itemUUIDs.replace(/,/g, ', ')}))`,
            );
            BulkEditSearchPane.verifyErrorLabel(11);

            // Step 39: Verify errors
            BulkEditSearchPane.verifyVisibleErrors(
              folioInstance.itemIdsUniversity,
              (itemId) => `User ${user.username} does not have required permission to view the item record - id=${itemId} on the tenant ${Affiliations.University.toLowerCase()}`,
              11,
            );

            // Step 40: Download errors CSV
            BulkEditActions.openActions();
            BulkEditActions.downloadErrors();

            const expectedErrors = folioInstance.itemIdsUniversity.map(
              (itemId) => `ERROR,${itemId},${`User ${user.username} does not have required permission to view the item record - id=${itemId} on the tenant ${Affiliations.University.toLowerCase()}`}`,
            );

            ExportFile.verifyFileIncludes(errorsFileItemUUID, expectedErrors);
          });
        },
      );
    });
  });
});
