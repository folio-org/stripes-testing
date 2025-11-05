import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C812999_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstance1: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix}_0`,
          holdingsCount: 2,
          itemsCount: 0,
        })[0],
        folioInstance2: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix}_1`,
          holdingsCount: 1,
          itemsCount: 0,
        })[0],
      };

      let user;
      let location;
      let materialType;
      let loanType;
      let holdingsARecordId;
      let holdingsBRecordId;
      let holdingsCRecordId;

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C812999_FolioInstance');

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
        }).then(() => {
          // Create instance 1
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: [testData.folioInstance1],
            location,
          });
          holdingsARecordId = testData.folioInstance1.holdings[0].id;
          holdingsBRecordId = testData.folioInstance1.holdings[1].id;

          // Create instance 2
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: [testData.folioInstance2],
            location,
          });
          holdingsCRecordId = testData.folioInstance2.holdings[0].id;

          // Create 5 items for Holdings A
          [1, 2, 3, 4, 5].forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsARecordId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            });
          });

          // Create 3 items for Holdings B
          [6, 7, 9].forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsBRecordId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            });
          });

          // Create 11 items for Holdings C
          [
            ...Array(11)
              .keys()
              .map((i) => i + 1),
          ].forEach((orderValue) => {
            cy.createItem({
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              holdingsRecordId: holdingsCRecordId,
              materialType: { id: materialType.id },
              permanentLoanType: { id: loanType.id },
              order: orderValue,
            });
          });
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiInventoryViewCreateEditItems.gui,
          Permissions.rtacGetBatchHoldingsCollection.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstance1.instanceId,
        );
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstance2.instanceId,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C812999 API MOD-RTAC | Verify "itemDisplayOrder" field exists in BATCH API which gets instances with items and holdings from inventory (spitfire)',
        {
          tags: ['extendedPath', 'spitfire', 'C812999'],
        },
        () => {
          cy.getToken(user.username, user.password);

          cy.getRtacBatchViaApi([
            testData.folioInstance1.instanceId,
            testData.folioInstance2.instanceId,
          ]).then((response) => {
            expect(response.status).to.eq(200);

            const instance1Items = response.body.holdings.find(
              (inst) => inst.instanceId === testData.folioInstance1.instanceId,
            ).holdings;
            const instance2Items = response.body.holdings.find(
              (inst) => inst.instanceId === testData.folioInstance2.instanceId,
            ).holdings;

            expect(
              instance1Items.map((item) => item.itemDisplayOrder).sort((a, b) => a - b),
            ).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 9]);
            expect(
              instance2Items.map((item) => item.itemDisplayOrder).sort((a, b) => a - b),
            ).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
          });
        },
      );
    });
  });
});
