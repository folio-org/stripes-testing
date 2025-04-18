import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  ORDER_TYPES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import {
  OrderDetails,
  OrderEditForm,
  OrderLineEditForm,
  Orders,
} from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OpenOrder from '../../../support/fragments/settings/orders/openOrder';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    instance: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization);
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });
      OpenOrder.setOpenOrderValue(true);
    });

    cy.createTempUser([
      Permissions.uiInventoryCreateOrderFromInstance.gui,
      Permissions.uiInventoryViewCreateEditHoldings.gui,
      Permissions.uiInventoryViewCreateEditInstances.gui,
      Permissions.uiInventoryViewCreateEditItems.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    OpenOrder.setOpenOrderValue(false);
    Orders.getOrdersApi({ query: `"poNumber"=="${testData.poNumber}"` }).then((orders) => {
      Orders.deleteOrderViaApi(orders[0].id);
    });
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C353988 A user can create and save new order and PO line from instance record (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      // Click on instance from preconditions
      InventoryInstances.searchByTitle(testData.instance.instanceTitle);
      InventoryInstances.selectInstance();

      // Click "Actions" button, Select "New order" option
      const NewOrderModal = InventoryInstance.openCreateNewOrderModal();

      // Click "Create" button
      NewOrderModal.clickCreateButton();
      OrderEditForm.checkButtonsConditions([
        { label: 'Cancel', conditions: { disabled: false } },
        { label: 'Add POL', conditions: { disabled: true } },
      ]);

      OrderEditForm.getOrderNumber().then((poNumber) => {
        testData.poNumber = poNumber;
        // Fill in all the mandatory fields
        OrderEditForm.fillOrderFields({
          orderInfo: {
            orderType: ORDER_TYPES.ONE_TIME,
            organizationName: testData.organization.name,
          },
        });

        // Click "Add POL" button
        OrderEditForm.clickAddPolButton();
        OrderLineEditForm.checkButtonsConditions([
          { label: 'Cancel', conditions: { disabled: false } },
          { label: 'Save & close', conditions: { disabled: false } },
        ]);

        // Fill in all the mandatory fields, Click "Save & close" button
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

        // Check Order details
        OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
        OrderDetails.checkOrderLinesTableContent([
          { poLineTitle: testData.instance.instanceTitle },
        ]);
      });
    },
  );
});
