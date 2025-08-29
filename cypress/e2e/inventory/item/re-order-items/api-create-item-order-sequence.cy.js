import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808480_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdholdingsCount: 1,
          itemsCount: 0,
        }),
        initialOrderValues: [1, 2, 3], // Initial 3 items with orders 1, 2, 3
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsRecordId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808480_FolioInstance');

        cy.then(() => {
          // Get required reference data
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
          }).then((res) => {
            location = res;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            loanType = loanTypes[0];
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialType = res;
          });
          // Create instance with holdings
        }).then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsRecordId = testData.folioInstances[0].holdings[0].id;

          // Create initial items using cycle
          testData.initialOrderValues.forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId,
              barcode: uuid(),
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            });
          });
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
        ]).then((userProperties) => {
          user = userProperties;
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
        'C808480 API | Create "Item" with duplicated / last in the sequence / out of the sequence "order" value (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C808480'] },
        () => {
          const itemBodyBase = {
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            holdingsRecordId,
            materialType: {
              id: materialType.id,
            },
            permanentLoanType: {
              id: loanType.id,
            },
          };

          // Step 1: Create item with duplicated order value (1)
          cy.createItem({
            ...itemBodyBase,
            barcode: uuid(),
            order: 1,
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body).to.have.property('order', 1);
          });

          // Step 2: Verify items are sorted and 2 items have same order value (1)
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(4);
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 1, 2, 3]);
          });

          // Step 3: Create item with last sequence order value (4)
          cy.createItem({
            ...itemBodyBase,
            barcode: uuid(),
            order: 4,
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body).to.have.property('order', 4);
          });

          // Step 4: Verify sorting sequence is 1, 1, 2, 3, 4
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(5);
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 1, 2, 3, 4]);
          });

          // Step 5: Create item with out of sequence order value (999)
          cy.createItem({
            ...itemBodyBase,
            barcode: uuid(),
            order: 999,
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body).to.have.property('order', 999);
          });

          // Step 6: Verify sorting sequence is 1, 1, 2, 3, 4, 999
          InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
            expect(items).to.have.length(6);
            const orderValues = items.map((item) => item.order);
            expect(orderValues).to.deep.equal([1, 1, 2, 3, 4, 999]);
          });

          // Step 7: Create duplicate of the last sequence order value (999)
          cy.createItem({
            ...itemBodyBase,
            barcode: uuid(),
            order: 999,
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body).to.have.property('order', 999);
          });

          // Step 8: Create item without order value (should get 1000)
          cy.createItem({
            ...itemBodyBase,
            barcode: uuid(),
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body).to.have.property('order', 1000);
          });
        },
      );
    });
  });
});
