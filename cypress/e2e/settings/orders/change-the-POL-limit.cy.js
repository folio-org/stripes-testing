import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('orders: Settings', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    approved: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  const secondItem = {
    instanceName: `testBulkEdit_2_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  let orderNumber;
  let user;
  let effectiveLocationServicePoint;
  let location;

  before(() => {
    cy.getAdminToken();

    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
    ]).then((userProperties) => {
      user = userProperties;
      ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' }).then((servicePoints) => {
        effectiveLocationServicePoint = servicePoints[0];
        NewLocation.createViaApi(
          NewLocation.getDefaultLocation(effectiveLocationServicePoint.id),
        ).then((locationResponse) => {
          location = locationResponse;
          Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
            organization.id = organizationsResponse;
            order.vendor = organizationsResponse;
          });
          InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
          InventoryInstances.createInstanceViaApi(secondItem.instanceName, secondItem.itemBarcode);

          cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
          cy.createOrderApi(order).then((response) => {
            orderNumber = response.body.poNumber;
          });
        });
      });

      cy.login(userProperties.username, userProperties.password, {
        path: SettingsMenu.ordersPurchaseOrderLinesLimit,
        waiter: SettingsOrders.waitLoadingPurchaseOrderLinesLimit,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.ordersPurchaseOrderLinesLimit,
      waiter: SettingsOrders.waitLoadingPurchaseOrderLinesLimit,
    });
    SettingsOrders.setPurchaseOrderLinesLimit(1);
    Orders.deleteOrderViaApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id,
    );

    Users.deleteViaApi(user.userId);
  });

  it(
    'C668 Change the purchase order lines limit, then create POs with PO Lines of (PO Line limit + 1), to see how the order app behaves (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'system'] },
    () => {
      SettingsOrders.setPurchaseOrderLinesLimit(2);
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
      OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
        'Purchase',
        location.institutionId,
        '4',
      );
      OrderLines.backToEditingOrder();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP(secondItem.instanceName, 0);
      OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
        'Purchase',
        location.institutionId,
        '4',
      );
      OrderLines.backToEditingOrder();
      Orders.createPOLineViaActions();
      Orders.checkPurchaseOrderLineLimitReachedModal();
    },
  );
});
