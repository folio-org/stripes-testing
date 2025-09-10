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
      const instanceTitlePrefix = `AT_C808481_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 2,
          itemsCount: 0,
        }),
        holdingAOrderValues: [1, 2, 3], // Holdings A: 3 items
        holdingBOrderValues: [1, 2, 3, 4, 5], // Holdings B: 5 items
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsRecordAId;
      let holdingsRecordBId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808481_FolioInstance');

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
          // Create instance with multiple holdings
        }).then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsRecordAId = testData.folioInstances[0].holdings[0].id;
          holdingsRecordBId = testData.folioInstances[0].holdings[1].id;

          // Create initial items for Holdings A using cycle
          testData.holdingAOrderValues.forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsRecordAId,
              barcode: uuid(),
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            });
          });

          // Create initial items for Holdings B using cycle
          testData.holdingBOrderValues.forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsRecordBId,
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
        'C808481 API | Create "Item" with empty "order" field when Instance has multiple Holdings with Items (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C808481'] },
        () => {
          cy.getToken(user.username, user.password);

          const itemBodyBase = {
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            materialType: {
              id: materialType.id,
            },
            permanentLoanType: {
              id: loanType.id,
            },
          };

          // Step 1: Create item without order field in Holdings A (should get order 4)
          cy.createItem({
            ...itemBodyBase,
            holdingsRecordId: holdingsRecordAId,
            barcode: uuid(),
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body).to.have.property('order', 4);
          });

          // Step 2: Create item without order field in Holdings B (should get order 6)
          cy.createItem({
            ...itemBodyBase,
            holdingsRecordId: holdingsRecordBId,
            barcode: uuid(),
          }).then((response) => {
            expect(response.status).to.eq(201);
            expect(response.body).to.have.property('order', 6);
          });

          // Step 3: Verify Holdings A items are properly sorted (1,2,3,4)
          cy.then(() => {
            InventoryItems.getItemsInHoldingsViaApi(holdingsRecordAId).then((items) => {
              expect(items).to.have.length(4);

              // Verify items are sorted by order field with sequence 1,2,3,4
              expect(items[0].order).to.eq(1);
              expect(items[1].order).to.eq(2);
              expect(items[2].order).to.eq(3);
              expect(items[3].order).to.eq(4);
            });
          });
        },
      );
    });
  });
});
