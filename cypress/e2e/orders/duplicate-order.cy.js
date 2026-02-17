import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
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
  let user;
  let location;
  let servicePointId;
  let orderNumber;

  before(() => {
    cy.waitForAuthRefresh(() => {
      cy.loginAsAdmin({
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });
    Organizations.createOrganizationViaApi(organization).then((organizationsResponse) => {
      organization.id = organizationsResponse;
      order.vendor = organizationsResponse;
    });
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
      OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.name);
      Orders.backToPO();
      Orders.openOrder();
    });
    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersView.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersDelete.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.unOpenOrder();
    // Need to wait until the order is opened before deleting it
    cy.wait(2000);
    Orders.deleteOrderViaApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);
    NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id,
    );
    Users.deleteViaApi(user.userId);
  });

  it(
    'C9220 Duplicate purchase order (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C9220', 'shiftLeft'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.duplicateOrder();
      InteractorsTools.checkCalloutMessage('The purchase order was successfully duplicated');
      Orders.checkDuplicatedOrder(
        organization.name,
        `${user.username}, testPermFirst testMiddleName`,
      );
      Orders.deleteOrderViaActions();
    },
  );
});
