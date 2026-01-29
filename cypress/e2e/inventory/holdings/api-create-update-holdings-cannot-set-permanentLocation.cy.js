import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Holdings', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C423393_FolioInstance_${randomPostfix}`;
    const permanentLocationFieldName = 'permanentLocation';
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitle,
        holdingsCount: 0,
        itemsCount: 0,
      }),
    };

    let location;
    let holdingsId;
    let holdingsHrid;
    let holdingsSourceId;

    before('Create test data', () => {
      cy.then(() => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C423393');
      })
        .then(() => {
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
          }).then((res) => {
            location = res;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            holdingsSourceId = folioSource.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
    });

    it(
      'C423393 Verify that "permanentLocation" field cannot be added to new/exising Holdings record (spitfire)',
      { tags: ['extendedPath', 'backend', 'spitfire', 'C423393'] },
      () => {
        cy.then(() => {
          cy.getAdminToken();
          InventoryHoldings.createHoldingRecordViaApi(
            {
              instanceId: testData.folioInstances[0].instanceId,
              permanentLocationId: location.id,
              sourceId: holdingsSourceId,
            },
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(201);
            expect(body).to.not.have.property(permanentLocationFieldName);
            holdingsId = body.id;
            holdingsHrid = body.hrid;
          });
        })
          .then(() => {
            InventoryHoldings.createHoldingRecordViaApi(
              {
                instanceId: testData.folioInstances[0].instanceId,
                permanentLocationId: location.id,
                [permanentLocationFieldName]: 'Test',
                sourceId: holdingsSourceId,
              },
              true,
            ).then(({ status, body }) => {
              expect(status).to.eq(422);
              expect(body.errors[0].message).to.include(
                `Unrecognized field "${permanentLocationFieldName}"`,
              );
            });
          })
          .then(() => {
            cy.updateHoldingRecord(holdingsId, {
              id: holdingsId,
              _version: 1,
              sourceId: holdingsSourceId,
              hrid: holdingsHrid,
              instanceId: testData.folioInstances[0].instanceId,
              permanentLocationId: location.id,
              callNumber: 'test12345',
            }).then(({ status }) => {
              expect(status).to.eq(204);
            });
          })
          .then(() => {
            cy.updateHoldingRecord(
              holdingsId,
              {
                id: holdingsId,
                _version: 1,
                sourceId: holdingsSourceId,
                hrid: holdingsHrid,
                instanceId: testData.folioInstances[0].instanceId,
                [permanentLocationFieldName]: 'Test',
                permanentLocationId: location.id,
                callNumber: 'test12345',
              },
              true,
            ).then(({ status, body }) => {
              expect(status).to.eq(422);
              expect(body.errors[0].message).to.include(
                `Unrecognized field "${permanentLocationFieldName}"`,
              );
            });
          });
      },
    );
  });
});
