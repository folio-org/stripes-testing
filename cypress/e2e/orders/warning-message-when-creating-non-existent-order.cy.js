import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

const item = {
  instanceName: `inventory_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const wrongMessage = 'PO number does not exist';
const wrongPO = `${randomFourDigitNumber()}`;
let userData;

describe('Orders', () => {
  describe('Inventory interaction', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiInventoryCreateOrderFromInstance.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    });

    it(
      'C353991 Warning message appears when creating order from instance record and select not existing order (Thunderjet)(TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353991'] },
      () => {
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.byKeywords(item.instanceName);
        InventoryInstance.checkInstanceTitle(item.instanceName);

        const NewOrderModal = InventoryInstance.openCreateNewOrderModal();

        NewOrderModal.enterOrderNumber(wrongPO);
        NewOrderModal.verifyTextMessageExists(wrongMessage);
      },
    );
  });
});
