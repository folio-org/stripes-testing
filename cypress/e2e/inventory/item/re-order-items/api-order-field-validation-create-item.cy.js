import uuid from 'uuid';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C808478_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstances: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix,
          holdingsCount: 1,
          itemsCount: 0,
        }),
        errorMessage: 'Order should be a number',
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsRecordId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808478_FolioInstance');

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
        'C808478 API | "order" field validation in create "Item" request (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C808478'] },
        () => {
          cy.getToken(user.username, user.password);

          const itemBodyBase = {
            status: {
              name: ITEM_STATUS_NAMES.AVAILABLE,
            },
            holdingsRecordId,
            barcode: uuid(),
            materialType: {
              id: materialType.id,
            },
            permanentLoanType: {
              id: loanType.id,
            },
          };

          [
            { ...itemBodyBase, order: 'a' },
            { ...itemBodyBase, order: '$' },
            { ...itemBodyBase, order: '1b' },
            { ...itemBodyBase, order: '1!' },
            { ...itemBodyBase, order: '01' },
            { ...itemBodyBase, order: '' },
            { ...itemBodyBase, order: ' ' },
          ].forEach((itemBody) => {
            cy.createItem(itemBody, true).then((response) => {
              expect(response.status).to.eq(422);
              expect(response.body.errors[0].message).to.equal(testData.errorMessage);
            });
          });
        },
      );
    });
  });
});
