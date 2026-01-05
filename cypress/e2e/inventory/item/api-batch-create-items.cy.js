import uuid from 'uuid';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import HoldingsSources from '../../../support/fragments/settings/inventory/holdings/holdingsSources';
import inventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Instances', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C959225_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        holdingsCount: 1,
        itemsCount: 0,
      }),
    };
    let user;
    let location;
    let materialType;
    let loanType;
    let holdingsId;
    let holdingsSourceId;

    before('Get reference data and create user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C959225_FolioInstance');

      cy.then(() => {
        // Get required reference data
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          location = Cypress.env('locations')[0];
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
          loanType = loanTypes[0];
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialType = res;
        });
        HoldingsSources.getHoldingsSourcesViaApi({
          query: 'name="folio"',
        }).then((holdingsSources) => {
          holdingsSourceId = holdingsSources[0].id;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
            sourceId: holdingsSourceId,
          });
          holdingsId = testData.folioInstances[0].holdings[0].id;
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.inventoryStorageItemsBatchUpdate.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C959225 API | Create multiple Items using POST /item-storage/batch/synchronous with / without upsert=true parameter',
      { tags: ['extendedPath', 'spitfire', 'C959225'] },
      () => {
        // Step 1. Send POST ‘/item-storage/batch/synchronous’ with following body (without item “id” and without "upsert=true" parameter)
        const itemRecordsWithoutIdsOne = [
          {
            holdingsRecordId: holdingsId,
            barcode: `C959225_1_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
          {
            holdingsRecordId: holdingsId,
            barcode: `C959225_2_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchCreateItemsViaApi(itemRecordsWithoutIdsOne).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 2. Verify that created Items are appeared in Holdings record
        inventoryItems.getItemsInHoldingsViaApi(holdingsId).then((items) => {
          expect(items[0].barcode).to.eq(itemRecordsWithoutIdsOne[0].barcode);
          expect(items[1].barcode).to.eq(itemRecordsWithoutIdsOne[1].barcode);
        });

        // Step 3. Send POST ‘/item-storage/batch/synchronous’ with following body (with item “id” and without "upsert=true" parameter)
        const itemRecordsWithIdsOne = [
          {
            id: `${uuid()}`,
            holdingsRecordId: holdingsId,
            barcode: `C959225_3_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
          {
            id: `${uuid()}`,
            holdingsRecordId: holdingsId,
            barcode: `C959225_4_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchCreateItemsViaApi(itemRecordsWithIdsOne).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 4. Verify that created Items are appeared in Holdings record
        inventoryItems.getItemsInHoldingsViaApi(holdingsId).then((items) => {
          expect(items[2].barcode).to.eq(itemRecordsWithIdsOne[0].barcode);
          expect(items[3].barcode).to.eq(itemRecordsWithIdsOne[1].barcode);
        });

        // Step 5. Send POST ‘/item-storage/batch/synchronous’ with following body (without item “id” and with "upsert=true" parameter)
        const itemRecordsWithoutIdsTwo = [
          {
            holdingsRecordId: holdingsId,
            barcode: `C959225_5_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
          {
            holdingsRecordId: holdingsId,
            barcode: `C959225_6_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateItemsViaApi(itemRecordsWithoutIdsTwo).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 6. Verify that created Items are appeared in Holdings record
        inventoryItems.getItemsInHoldingsViaApi(holdingsId).then((items) => {
          expect(items[4].barcode).to.eq(itemRecordsWithoutIdsTwo[0].barcode);
          expect(items[5].barcode).to.eq(itemRecordsWithoutIdsTwo[1].barcode);
        });

        // Step 7. Send POST ‘/item-storage/batch/synchronous’ with following body (with item “id” and with "upsert=true" parameter) to create Items
        const itemRecordsWithIdsTwo = [
          {
            id: `${uuid()}`,
            holdingsRecordId: holdingsId,
            barcode: `C959225_7_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
          {
            id: `${uuid()}`,
            holdingsRecordId: holdingsId,
            barcode: `C959225_8_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateItemsViaApi(itemRecordsWithIdsTwo).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 8. Verify that created Items are appeared in Holdings record
        inventoryItems.getItemsInHoldingsViaApi(holdingsId).then((items) => {
          expect(items[6].barcode).to.eq(itemRecordsWithIdsTwo[0].barcode);
          expect(items[7].barcode).to.eq(itemRecordsWithIdsTwo[1].barcode);
        });

        // Step 9. Send POST ‘/item-storage/batch/synchronous’ with following body (with item “id” and with "upsert=true" parameter) to update Items
        const itemRecordsWithIdsTwoUpdated = [
          {
            _version: 1,
            id: itemRecordsWithIdsTwo[0].id,
            holdingsRecordId: holdingsId,
            barcode: `C959225_7_updated_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
          {
            _version: 1,
            id: itemRecordsWithIdsTwo[1].id,
            holdingsRecordId: holdingsId,
            barcode: `C959225_8_updated_${getRandomPostfix()}`,
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialTypeId: materialType.id,
            permanentLoanTypeId: loanType.id,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateItemsViaApi(itemRecordsWithIdsTwoUpdated).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 8. Verify that created Items are appeared in Holdings record
        inventoryItems.getItemsInHoldingsViaApi(holdingsId).then((items) => {
          expect(items[6].barcode).to.eq(itemRecordsWithIdsTwoUpdated[0].barcode);
          expect(items[7].barcode).to.eq(itemRecordsWithIdsTwoUpdated[1].barcode);
        });
      },
    );
  });
});
