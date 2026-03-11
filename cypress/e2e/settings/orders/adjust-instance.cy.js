import {
  APPLICATION_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import Organizations from '../../../support/fragments/organizations/organizations';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const testData = {
      order: {},
      user: {},
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.OTHER,
      instanceType: 'notated music',
      loanType: LOAN_TYPE_NAMES.SELECTED,
    };

    before(() => {
      cy.getAdminToken();
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResponse) => {
          testData.location = locationResponse;

          cy.getBookMaterialType().then((mtypeResponse) => {
            testData.materialTypeId = mtypeResponse.id;

            Organizations.getOrganizationViaApi({ query: `name="${VENDOR_NAMES.GOBI}"` }).then(
              (orgResponse) => {
                testData.organization = { id: orgResponse.id };

                const order = {
                  ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
                  orderType: 'One-Time',
                  approved: true,
                };

                const orderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 10,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                  },
                  receiptStatus: 'Awaiting Receipt',
                  orderFormat: 'Other',
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: testData.materialTypeId,
                  },
                  locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
                };

                Orders.createOrderWithOrderLineViaApi(order, orderLine).then((orderResponse) => {
                  testData.order = orderResponse;
                  testData.orderNumber = orderResponse.poNumber;
                });
              },
            );
          });
        },
      );

      cy.createTempUser([
        Permissions.uiOrdersReopenPurchaseOrders.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.ordersInstanceStatusPath,
          waiter: SettingsOrders.waitLoadingInstanceStatus,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(testData.order.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C9219 Adjust Instance status, instance type and loan type defaults (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C9219'] },
      () => {
        SettingsOrders.selectInstanceStatus(testData.instanceStatus);
        SettingOrdersNavigationMenu.selectInstanceType();
        SettingsOrders.selectInstanceType(testData.instanceType);
        SettingOrdersNavigationMenu.selectLoanType();
        SettingsOrders.selectLoanType(testData.loanType);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
        Orders.searchByParameter('PO number', testData.orderNumber);
        Orders.selectFromResultsList(testData.orderNumber);
        Orders.openOrder();
        OrderLines.selectPOLInOrder(0);
        OrderLines.openInstance();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.verifyLoan(testData.loanType);
        InstanceRecordView.verifyResourceType(testData.instanceType);
        InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatus);
      },
    );
  });
});
