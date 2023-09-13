import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';

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
    cy.getAdminToken();

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

    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });

    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      orderID = response.body.id;
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

      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    Orders.deleteOrderViaApi(orderID);
    Organizations.deleteOrganizationViaApi(organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id,
    );
    Users.deleteViaApi(user.userId);
  });

  it(
    'C9177 Change location during receiving (thunderjet)',
    { tags: [testType.smoke, devTeams.thunderjet] },
    () => {
      const caption = 'autotestCaption';
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      // Receiving part
      Orders.receiveOrderViaActions();
      Receiving.selectFromResultsList(item.instanceName);
      Receiving.receiveAndChangeLocation(0, caption, location.institutionId);

      Receiving.checkReceived(0, caption);
      Receiving.selectInstanceInReceive(item.instanceName);
    },
  );
});
