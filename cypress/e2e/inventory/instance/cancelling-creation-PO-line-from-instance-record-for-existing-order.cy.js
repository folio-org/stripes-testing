import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import { ORDER_STATUSES } from '../../../support/constants';
import AreYouSureModal from '../../../support/fragments/orders/modals/areYouSureModal';

describe('Orders', () => {
  describe('Inventory interactions', () => {
    const instance = {
      instanceName: `C353993_${getRandomPostfix()}`,
      itemBarcode: getRandomPostfix(),
    };
    let userData;
    const testData = {
      organization: NewOrganization.getDefaultOrganization({ accounts: 1 }),
      order: {},
    };
    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });
      });
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
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C353993 Cancelling creation PO line from instance record for existing order (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet'] },
      () => {
        // Navigate to the instance from preconditions
        InventorySearchAndFilter.searchInstanceByTitle(instance.instanceName);
        InventoryInstances.selectInstance();

        // Click Actions->New order
        const NewOrderModal = InventoryInstance.newOrder();
        NewOrderModal.waitLoading();

        // Enter order number from preconditions into "PO number" field and click "Create" button
        NewOrderModal.enterOrderNumber(testData.order.poNumber);
        NewOrderModal.clickCreateButton();
        OrderLineEditForm.waitLoading();

        // Click "Cancel" button
        OrderLineEditForm.clickCancelButton(true);
        AreYouSureModal.verifyAreYouSureForm(true);

        // Click "Close without saving" button
        AreYouSureModal.clickCloseWithoutSavingButton();
        AreYouSureModal.verifyAreYouSureForm(false);

        // Navigate to purchase order details pane
        Orders.waitLoading();
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

        OrderDetails.verifyPOLCount(0);
      },
    );
  });
});
