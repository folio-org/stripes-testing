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

describe('orders: create', () => {
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
    cy.getAdminToken();

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
      cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 3);
      OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.name);
    });

    cy.createTempUser([permissions.uiOrdersEdit.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
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
    'C665 Edit an existing PO Line on a "Pending" order (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C665'] },
    () => {
      Orders.selectPendingStatusFilter();
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
      OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.name);
      InteractorsTools.checkCalloutMessage(
        `The purchase order line ${orderNumber}-1 was successfully updated`,
      );
    },
  );
});
