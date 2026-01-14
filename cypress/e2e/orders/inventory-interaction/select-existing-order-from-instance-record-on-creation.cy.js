import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Permissions from '../../../support/dictionary/permissions';
import { NewOrder, Orders, OrderDetails } from '../../../support/fragments/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
} from '../../../support/constants';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Users from '../../../support/fragments/users/users';
import NewOrderModal from '../../../support/fragments/inventory/modals/newOrderModal';

const organization = NewOrganization.getDefaultOrganization();
const testData = {
  instanceName: `inventory_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  organization,
  order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
};
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
        InventoryInstances.createInstanceViaApi(testData.instanceName, testData.itemBarcode);
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C353989 A user can select existing order when creating an order from instance record (Thunderjet)(TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C353989'] },
      () => {
        InventorySearchAndFilter.byKeywords(testData.instanceName);
        InventoryInstance.checkInstanceTitle(testData.instanceName);
        InventoryInstance.openCreateNewOrderModal();

        NewOrderModal.enterOrderNumber(testData.order.poNumber);
        NewOrderModal.clickCreateButton();
        OrderLineEditForm.waitLoading();

        OrderLineEditForm.fillOrderLineFields({
          poLineDetails: {
            acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
            orderFormat: ORDER_FORMAT_NAMES.OTHER,
          },
          costDetails: {
            physicalUnitPrice: '10',
            quantityPhysical: '1',
          },
        });
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineEditForm.verifyOrderLineEditFormClosed();
        Orders.waitLoading();

        OrderDetails.openPolDetails(testData.instanceName);
        OrderLines.verifyOrderFieldContent({
          name: 'Acquisition method',
          value: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
        });
        OrderLines.verifyOrderFieldContent({
          name: 'Order format',
          value: ORDER_FORMAT_NAMES.OTHER,
        });
        OrderLines.verifyOrderFieldContent({ name: 'Physical unit price', value: '$10.00' });
        OrderLines.verifyOrderFieldContent({ name: 'Quantity physical', value: '1' });
      },
    );
  });
});
