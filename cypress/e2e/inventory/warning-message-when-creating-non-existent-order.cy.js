import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

const item = {
  instanceName: `inventory_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const wrongMessage = 'PO number does not exist';
const wrongPO = `${randomFourDigitNumber()}`;

describe('Inventory interaction', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    cy.loginAsAdmin({
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
  });

  it(
    'C353991 - Warning message appears when creating order from instance record and select not existing order (Thunderjet)(TaaS)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      InventorySearchAndFilter.switchToInstance();
      InventorySearchAndFilter.byKeywords(item.instanceName);
      InventoryInstance.checkInstanceTitle(item.instanceName);

      InventorySearchAndFilter.clickNewOrder();
      InventorySearchAndFilter.varifyModalDialogExists();

      InventorySearchAndFilter.fullAndCreatePONumber(wrongPO);
      InventorySearchAndFilter.varifyTextMessageExists(wrongMessage);
    },
  );
});
