import { Permissions } from '../../support/dictionary';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    user: {},
    orderPhysical: {},
    orderElectronic: {},
    orderLinePhysical: {},
    orderLineElectronic: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      testData.orderLinePhysical = {
        ...BasicOrderLine.getDefaultOrderLine({ checkinItems: false }),
        orderFormat: 'Physical Resource',
        physical: {
          createInventory: 'Instance, Holding, Item',
          materialSupplier: testData.organization.id,
          volumes: [],
        },
      };
      testData.orderLineElectronic = {
        ...BasicOrderLine.getDefaultOrderLine({ checkinItems: false }),
        orderFormat: 'Electronic Resource',
        cost: {
          listUnitPriceElectronic: 1.0,
          currency: 'USD',
          discountType: 'percentage',
          quantityElectronic: 1,
          poLineEstimatedPrice: 1.0,
        },
        eresource: {
          activated: false,
          createInventory: 'Instance, Holding',
          trial: false,
          accessProvider: testData.organization.id,
        },
        locations: [],
      };

      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
        testData.orderLinePhysical,
      ).then((order) => {
        testData.orderPhysical = order;
      });

      Orders.createOrderWithOrderLineViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
        testData.orderLineElectronic,
      ).then((order) => {
        testData.orderElectronic = order;
      });
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.receivingPath,
        waiter: Receiving.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Orders.deleteOrderViaApi(testData.orderPhysical.id);
    Orders.deleteOrderViaApi(testData.orderElectronic.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C627458 "Add piece" action is not displayed in "Receiving" app when related order has "Pending" status and "Synchronized" workflow (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C627458'] },
    () => {
      // Step 1: Go to title details pane related to POL from Order #1 (One-time, Physical)
      Receiving.searchByParameter({ value: testData.orderLinePhysical.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLinePhysical.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLinePhysical.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);

      // Step 2: Click "Actions" in "Expected" accordion — "Add piece" must NOT be present
      ReceivingDetails.verifyAddPieceButtonAbsent();
      ReceivingDetails.closeDetailsPane();

      // Step 3: Go to title details pane related to POL from Order #2 (Ongoing, Electronic)
      Receiving.searchByParameter({ value: testData.orderLineElectronic.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLineElectronic.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLineElectronic.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);

      // Step 4: Click "Actions" in "Expected" accordion — "Add piece" must NOT be present
      ReceivingDetails.verifyAddPieceButtonAbsent();
    },
  );
});
