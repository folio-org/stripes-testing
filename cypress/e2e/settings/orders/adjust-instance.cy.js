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
import ResourceTypes from '../../../support/fragments/settings/inventory/instances/resourceTypes';
import InventoryInteractions from '../../../support/fragments/settings/orders/inventoryInteractions';
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
    };

    // Picks an instance status term that is NOT already the default in Settings, so the test
    // always exercises a real change regardless of the environment's current configuration.
    // "Other" is preferred when it isn't already the default, to keep the common case stable.
    // The stored config value is lowercase (e.g. "other"), not the display text, so compare
    // case-insensitively.
    const pickDifferentInstanceStatus = (currentValue) => [INSTANCE_STATUS_TERM_NAMES.OTHER, ...Object.values(INSTANCE_STATUS_TERM_NAMES)].find(
      (status) => status.toLowerCase() !== String(currentValue).toLowerCase(),
    );

    // Same idea as above, but for settings backed by real reference data (instance types, loan
    // types) instead of a fixed enum: `names` comes from the actual API list, `preferredName`
    // keeps the previous hardcoded default when it isn't already selected.
    const pickDifferentReferenceName = (names, currentValue, preferredName) => [preferredName, ...names].find(
      (name) => name.toLowerCase() !== String(currentValue).toLowerCase(),
    );

    before(() => {
      cy.getAdminToken();
      InventoryInteractions.getInstanceStatusSettings().then((configs) => {
        testData.instanceStatus = pickDifferentInstanceStatus(configs[0]?.value);
      });
      InventoryInteractions.getInstanceTypeSettings().then((configs) => {
        ResourceTypes.getViaApi({ limit: 100 }).then((instanceTypes) => {
          // The config stores the instance type CODE (e.g. "crd"), not its name, so the
          // current name must be resolved via the code before comparing against candidates.
          const currentInstanceType = instanceTypes.find(
            (instanceType) => instanceType.code === configs[0]?.value,
          );
          testData.instanceType = pickDifferentReferenceName(
            instanceTypes.map((instanceType) => instanceType.name),
            currentInstanceType?.name,
            'notated music',
          );
        });
      });
      InventoryInteractions.getLoanTypeSettings().then((configs) => {
        cy.getLoanTypes({ limit: 50 }).then((loanTypes) => {
          testData.loanType = pickDifferentReferenceName(
            loanTypes.map((loanType) => loanType.name),
            configs[0]?.value,
            LOAN_TYPE_NAMES.SELECTED,
          );
        });
      });
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
      { tags: ['criticalPath', 'thunderjet', 'nonParallel', 'C9219'] },
      () => {
        SettingsOrders.selectInstanceStatus(testData.instanceStatus);
        cy.wait(2000);
        SettingOrdersNavigationMenu.selectInstanceType();
        SettingsOrders.selectInstanceType(testData.instanceType);
        cy.wait(2000);
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
