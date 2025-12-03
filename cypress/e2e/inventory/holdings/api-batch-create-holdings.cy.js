import uuid from 'uuid';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import HoldingsSources from '../../../support/fragments/settings/inventory/holdings/holdingsSources';
import inventoryItems from '../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Holdings', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C927744_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 2,
        instanceTitlePrefix,
        holdingsCount: 0,
        itemsCount: 0,
      }),
      itemBarcode: `C927744_${randomPostfix}`,
      holdingsAUuid: uuid(),
      holdingsBUuid: uuid(),
    };

    let user;
    let locationA;
    let locationB;
    let materialType;
    let loanType;
    let holdingsAId;
    let holdingsSourceId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C927744_FolioInstance');

      cy.then(() => {
        // Get required reference data
        cy.getLocations({
          limit: 2,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          locationA = Cypress.env('locations')[0];
          locationB = Cypress.env('locations')[1];
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
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.inventoryStorageHoldingsBatchUpdate.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
        testData.folioInstances[1].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C927744 API | Create multiple holdings using POST /holdings-storage/batch/synchronous with upsert=true (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C927744'] },
      () => {
        // Step 1. Send POST ‘/holdings-storage/batch/synchronous?upsert=true’ with following body (without holdings “id”)
        const holdingsRecordWithoutIds = [
          {
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationA.id,
            sourceId: holdingsSourceId,
          },
          {
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationB.id,
            sourceId: holdingsSourceId,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateHoldingsViaApi(holdingsRecordWithoutIds).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 2. Verify that the holdings records were created successfully
        cy.getHoldings({
          query: `"instanceId"=="${testData.folioInstances[0].instanceId}"`,
        }).then((holdings) => {
          expect(holdings).to.have.length(2);
          holdingsAId = holdings[0].id;
          expect(holdings[0].instanceId).to.eq(testData.folioInstances[0].instanceId);
          expect(holdings[1].instanceId).to.eq(testData.folioInstances[0].instanceId);
        });

        // Step 3. Send POST request via "Postman" to create multiple new holdings records for the same instance record
        const holdingsRecordsWithId = [
          {
            id: testData.holdingsAUuid,
            instanceId: testData.folioInstances[1].instanceId,
            permanentLocationId: locationA.id,
            sourceId: holdingsSourceId,
          },
          {
            id: testData.holdingsBUuid,
            instanceId: testData.folioInstances[1].instanceId,
            permanentLocationId: locationB.id,
            sourceId: holdingsSourceId,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateHoldingsViaApi(holdingsRecordsWithId).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);

          // Step 4-5. Verify that the holdings records were created successfully
          cy.getHoldings({
            query: `"instanceId"=="${testData.folioInstances[1].instanceId}"`,
          }).then((holdings) => {
            expect(holdings).to.have.length(2);
            holdingsAId = holdings[0].id;
            expect(holdings[0].instanceId).to.eq(testData.folioInstances[1].instanceId);
            expect(holdings[1].instanceId).to.eq(testData.folioInstances[1].instanceId);

            // Step 6. Create an item record linked to one of the newly created holdings records
            inventoryItems
              .createItemViaApi({
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                holdingsRecordId: holdingsAId,
                materialType: { id: materialType.id },
                permanentLoanType: { id: loanType.id },
                barcode: testData.itemBarcode,
              })
              .then((response) => {
                expect(response.barcode).to.eq(testData.itemBarcode);
              });

            // Step 7. Verify that the item is correctly linked to the holdings record
            inventoryItems.getItemsInHoldingsViaApi(holdingsAId).then((items) => {
              expect(items[0].barcode).to.eq(testData.itemBarcode);
            });
          });
        });
      },
    );
  });
});
