import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

const testData = {
  user: {},
  item: {
    instanceName: `Inventory Instance ${randomFourDigitNumber()}`,
    itemBarcode: randomFourDigitNumber(),
    holdingHRID: '',
  },
};

describe('Holdings', () => {
  before('Create test data', () => {
    cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((createdUserProperties) => {
      testData.user = createdUserProperties;
      cy.getHoldingTypes({ limit: 1 }).then((res) => {
        testData.holdingTypeId = res[0].id;
      });
      cy.getLocations({ limit: 1 })
        .then((res) => {
          testData.locationId = res.id;
        })
        .then(() => {
          testData.item.instanceId = InventoryInstances.createInstanceViaApi(
            testData.item.instanceName,
            testData.item.itemBarcode,
            undefined,
            undefined,
            undefined,
            undefined,
            [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              },
            ],
          );
        })
        .then(() => {
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${testData.item.instanceId}"`,
          }).then((holdings) => {
            testData.item.holdingHRID = holdings[0].hrid;
          });
        });
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.itemBarcode);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C367931 Verify that missing holdings source is not populated in the UI with instances source (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      InventorySearchAndFilter.switchToHoldings();
      InventorySearchAndFilter.searchHoldingsByHRID(testData.item.holdingHRID);
      InventoryInstance.openHoldingView();
      HoldingsRecordView.checkSource('-');
    },
  );
});
