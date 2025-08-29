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
      const instanceTitlePrefix = `AT_C808479_OrderFieldAutoAssign_${randomPostfix}`;
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
      let holdingsRecordId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808479_OrderFieldAutoAssign');

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
          // Create instance with holdings but no items
        }).then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
          holdingsRecordId = testData.folioInstances[0].holdings[0].id;
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
        'C808479 API | Create "Item" with empty "order" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C808479'] },
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

          cy.then(() => {
            // Create items without order field and verify auto-assignment
            [
              { ...itemBodyBase, barcode: uuid() },
              { ...itemBodyBase, barcode: uuid() },
            ].forEach((body, index) => {
              cy.createItem(body).then((response) => {
                expect(response.status).to.eq(201);
                expect(response.body).to.have.property('order', index + 1);
              });
            });
          }).then(() => {
            // Step 3: Get items by holdings ID and verify sorting
            InventoryItems.getItemsInHoldingsViaApi(holdingsRecordId).then((items) => {
              expect(items).to.have.length(2);
              expect(items[0].order).to.eq(1);
              expect(items[1].order).to.eq(2);
            });
          });
        },
      );
    });
  });
});
