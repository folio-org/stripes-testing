import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import testType from '../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

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
      }
    ]
  };
  const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
  const instanceStatus = 'Cataloged';
  const otherInstanceStatus = 'Other';
  const instanceType = 'cartographic image';
  const otherInstanceType = 'other';
  const loanType = 'Can circulate';
  const selectedLoanType = 'Selected';

  let orderNumber;
  let user;
  let effectiveLocationServicePoint;
  let location;

  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' })
      .then((servicePoints) => {
        effectiveLocationServicePoint = servicePoints[0];
        NewLocation.createViaApi(NewLocation.getDefaultLocation(effectiveLocationServicePoint.id))
          .then((locationResponse) => {
            location = locationResponse;
            Organizations.createOrganizationViaApi(organization)
              .then(organizationsResponse => {
                organization.id = organizationsResponse;
                order.vendor = organizationsResponse;
              });

            cy.loginAsAdmin({ path:TopMenu.ordersPath, waiter: Orders.waitLoading });
            cy.createOrderApi(order)
              .then((response) => {
                orderNumber = response.body.poNumber;
              });
          });
      });

    cy.createTempUser([
      permissions.uiOrdersReopenPurchaseOrders.gui,
      permissions.uiOrdersView.gui,
      permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui,
      permissions.uiInventoryViewInstances.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:SettingsMenu.ordersPurchaseOrderLinesLimit, waiter: SettingsOrders.waitLoadingPurchaseOrderLinesLimit });
      });
  });

  after(() => {
    cy.loginAsAdmin({ path:TopMenu.ordersPath, waiter: Orders.waitLoading });
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList();
    Orders.unOpenOrder();
    OrderLines.selectPOLInOrder(0);
    OrderLines.deleteOrderLine();
    // Need to wait until the order is opened before deleting it
    cy.wait(2000);
    Orders.deleteOrderViaApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id
    );
    cy.visit(SettingsMenu.ordersInstanceStatusPath);
    SettingsOrders.selectInstanceStatus(otherInstanceStatus);
    cy.visit(SettingsMenu.ordersInstanceTypePath);
    SettingsOrders.selectInstanceType(otherInstanceType);
    cy.visit(SettingsMenu.ordersLoanTypePath);
    SettingsOrders.selectLoanType(selectedLoanType);
    Users.deleteViaApi(user.userId);
  });

  it('C15497 Increase purchase order lines limit (items for receiving includes "Order closed" statuses) (thunderjet)', { tags: [testType.smoke, devTeams.thunderjet] }, () => {

    cy.visit(TopMenu.ordersPath);
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList();
    Orders.createPOLineViaActions();
    OrderLines.POLineInfodorPhysicalMaterialWithLocation(orderLineTitle, locationResponse.institutionId);
    OrderLines.backToEditingOrder();
  });
});
