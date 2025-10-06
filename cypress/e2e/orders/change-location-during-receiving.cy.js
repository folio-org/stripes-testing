import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('orders: Receive piece from Order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder, approved: true };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  let user;
  let orderNumber;
  let orderID;
  let location;
  let servicePointId;

  before(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({ path: TopMenu.orderLinesPath, waiter: OrderLines.waitLoading });
    });
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
    });
    InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });

    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      orderID = response.body.id;
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName);
      OrderLines.fillPOLWithTitleLookUp();
      OrderLines.backToEditingOrder();
      Orders.openOrder();
    });

    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.orderLinesPath,
          waiter: OrderLines.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(orderID);
    Organizations.deleteOrganizationViaApi(organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id,
    );
    Users.deleteViaApi(user.userId);
  });

  it(
    'C9177 Change location during receiving (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'shiftLeft', 'eurekaPhase1'] },
    () => {
      const displaySummary = 'autotestCaption';
      Orders.selectOrdersPane();
      Orders.resetFilters();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      // Receiving part
      Orders.receiveOrderViaActions();
      Receiving.selectFromResultsList(item.instanceName);
      Receiving.receiveAndChangeLocation(0, displaySummary, location.name);

      Receiving.checkReceived(0, displaySummary);
      Receiving.selectInstanceInReceive(item.instanceName);
    },
  );
});
