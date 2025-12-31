import uuid from 'uuid';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsSources from '../../../support/fragments/settings/inventory/holdings/holdingsSources';

describe('Inventory', () => {
  describe('Holdings', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C959218_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        holdingsCount: 0,
        itemsCount: 0,
      }),
      holdingsAUuid: uuid(),
      holdingsBUuid: uuid(),
    };

    let user;
    let locationA;
    let locationB;
    let holdingsSourceId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C959218_FolioInstance');

      cy.then(() => {
        // Get required reference data
        cy.getLocations({
          limit: 2,
          query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
        }).then(() => {
          locationA = Cypress.env('locations')[0];
          locationB = Cypress.env('locations')[1];
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
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C959218 API | Create multiple Holdings using POST /holdings-storage/batch/synchronous with empty fields (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C959218'] },
      () => {
        // Step 1. Send POST ‘/holdings-storage/batch/synchronous?upsert=true’ with following body (with empty fields)
        const holdingsRecordWithoutIds = [
          {
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationA.id,
            sourceId: holdingsSourceId,
            administrativeNotes: [''],
            statisticalCodeIds: [''],
            formerIds: [''],
            tags: {
              tagList: [''],
            },
          },
          {
            instanceId: testData.folioInstances[0].instanceId,
            permanentLocationId: locationB.id,
            sourceId: holdingsSourceId,
            administrativeNotes: [''],
            statisticalCodeIds: [''],
            formerIds: [''],
            tags: {
              tagList: [''],
            },
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateHoldingsViaApi(holdingsRecordWithoutIds).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 2. Verify that the holdings records were created successfully without empty fields
        cy.getHoldings({
          query: `"instanceId"=="${testData.folioInstances[0].instanceId}"`,
          limit: 1,
        }).then((holdings) => {
          expect(holdings[0].instanceId).to.eq(testData.folioInstances[0].instanceId);
          expect(holdings[0].administrativeNotes).to.deep.equal([]);
          expect(holdings[0].statisticalCodeIds).to.deep.equal([]);
          expect(holdings[0].formerIds).to.deep.equal([]);
          expect(holdings[0].tags.tagList).to.deep.equal([]);
        });
      },
    );
  });
});
