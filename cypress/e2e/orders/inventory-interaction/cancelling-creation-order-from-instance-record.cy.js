import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Inventory interactions', () => {
    const instance = {
      instanceName: `C353992_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    };
    let userData;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.uiInventoryCreateOrderFromInstance.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        InventoryInstances.createInstanceViaApi(instance.instanceName, instance.itemBarcode);
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
    });

    it(
      'C353992 Cancelling creation an order from instance record (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353992'] },
      () => {
        // Navigate to the instance from preconditions
        InventorySearchAndFilter.searchInstanceByTitle(instance.instanceName);
        InventoryInstances.selectInstance();

        // Click Actions->New order
        const NewOrderModal = InventoryInstance.openCreateNewOrderModal();

        // Click "Cancel" button
        NewOrderModal.clickCancel();

        // Check that the Create order modal is closed and the Instance pane is displayed
        NewOrderModal.isNotDisplayed();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyOrdersCount(0);
      },
    );
  });
});
