import { ACQUISITION_METHOD_NAMES_IN_PROFILE, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import ResourceTypes from '../../../support/fragments/settings/inventory/instances/resourceTypes';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    const testData = {
      instanceStatusType: {
        name: `C9219_instanceStatusType${getRandomPostfix()}`,
        code: `C9219_code${getRandomPostfix()}`,
      },
      instanceType: {
        name: getTestEntityValue(`C9219_centralLocalResourceType${getRandomPostfix()}`),
        code: getTestEntityValue(`C9219_centralCode${getRandomPostfix()}`),
        source: 'local',
      },
      loanType: { name: getTestEntityValue(`C9219_centralLoanType${getRandomPostfix()}`) },
    };
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
    };
    const defaultSettingsOfInstance = {
      instanceStatus: 'Cataloged',
      instanceType: 'cartographic image',
      loanType: 'Can circulate',
    };

    before(() => {
      cy.getAdminToken();
      NewInstanceStatusType.createViaApi(
        testData.instanceStatusType.name,
        testData.instanceStatusType.code,
      ).then((initialInstanceStatusType) => {
        testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
      });
      ResourceTypes.createViaApi(testData.instanceType).then((resourceTypeId) => {
        testData.instanceTypeId = resourceTypeId.body.id;
      });
      cy.createLoanType(testData.loanType).then((loanType) => {
        testData.loanTypeId = loanType.id;
      });
      cy.getLocations({ limit: 1 }).then((res) => {
        testData.location = res;

        cy.getDefaultMaterialType().then((mtype) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((params) => {
            Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
              organization.id = responseOrganizations;
              order.vendor = organization.id;

              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 100.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 100.0,
                },
                locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: params.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtype.id,
                  materialSupplier: responseOrganizations,
                  volumes: [],
                },
              };
              Orders.createOrderViaApi(order).then((orderResponse) => {
                order.id = orderResponse.id;
                testData.orderNumber = orderResponse.poNumber;
                orderLine.purchaseOrderId = orderResponse.id;

                OrderLines.createOrderLineViaApi(orderLine);
              });
            });
          });
        });
      });

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
      Orders.deleteOrderViaApi(order.id);
      Users.deleteViaApi(testData.user.userId);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testData.instanceHRID}"`,
      }).then((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
      InstanceStatusTypes.deleteViaApi(testData.instanceStatusTypeId);
      ResourceTypes.deleteViaApi(testData.instanceTypeId);
      cy.deleteLoanType(testData.loanTypeId);
      cy.loginAsAdmin({
        path: SettingsMenu.ordersInstanceStatusPath,
        waiter: SettingsOrders.waitLoadingInstanceStatus,
      });
      SettingOrdersNavigationMenu.selectInstanceStatus();
      SettingsOrders.selectInstanceStatus(defaultSettingsOfInstance.instanceStatus);
      SettingOrdersNavigationMenu.selectInstanceType();
      SettingsOrders.selectInstanceType(defaultSettingsOfInstance.instanceType);
      SettingOrdersNavigationMenu.selectLoanType();
      SettingsOrders.selectLoanType(defaultSettingsOfInstance.loanType);
    });

    it(
      'C9219 Adjust Instance status, instance type and loan type defaults (items for receiving includes "Order closed" statuses) (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C9219'] },
      () => {
        SettingsOrders.selectInstanceStatus(testData.instanceStatusType.name);
        SettingOrdersNavigationMenu.selectInstanceType();
        SettingsOrders.selectInstanceType(testData.instanceType.name);
        SettingOrdersNavigationMenu.selectLoanType();
        SettingsOrders.selectLoanType(testData.loanType.name);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.searchByParameter('PO number', testData.orderNumber);
        Orders.selectFromResultsList(testData.orderNumber);
        Orders.openOrder();
        OrderLines.selectPOLInOrder(0);
        OrderLines.openInstance();
        InventoryInstance.getAssignedHRID().then((instanceHRID) => {
          testData.instanceHRID = instanceHRID;
        });
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.verifyLoan(testData.loanType.name);
        InstanceRecordView.verifyResourceType(testData.instanceType.name);
        InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusType.name);
      },
    );
  });
});
