import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import ExportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import DateTools from '../../support/utils/dateTools';

describe('Orders: orders', () => {
  const order = { ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: false };
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
    ]
  };
  let user;
  let location;
  let servicePointId;
  let orderNumber;


  before(() => {
    cy.getAdminToken();

    ServicePoints.getViaApi()
      .then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId))
          .then(res => {
            location = res;
          });
      });
    Organizations.createOrganizationViaApi(organization)
      .then(organizationsResponse => {
        organization.id = organizationsResponse;
        order.vendor = organizationsResponse;
      });

    cy.createOrderApi(order)
      .then((response) => {
        orderNumber = response.body.poNumber;
        cy.loginAsAdmin({ path:TopMenu.ordersPath, waiter: Orders.waitLoading });
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList();
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
        OrderLines.fillInPOLineInfoForExportWithLocation(`${organization.accounts[0].name} (${organization.accounts[0].accountNo})`, 'Purchase', location.institutionId);
        OrderLines.backToEditingOrder();
        Orders.editOrder();
        Orders.approveOrder();
      });

    cy.createTempUser([
      permissions.uiOrdersEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
      });
  });

  after(() => {
    // cy.loginAsAdmin({ path:TopMenu.ordersPath, waiter: Orders.waitLoading });
    // Orders.searchByParameter('PO number', orderNumber);
    // Orders.selectFromResultsList();
    // Orders.unOpenOrder(orderNumber);
    // // Need to wait until the order is opened before deleting it
    // cy.wait(2000);
    Orders.deleteOrderViaApi(order.id);

    Organizations.deleteOrganizationViaApi(organization.id);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id
    );
    Users.deleteViaApi(user.userId);
  });

  it('C369046: "Version history" viewing for Order (thunderjet)', { tags: [TestTypes.smoke, devTeams.thunderjet] }, () => {
    const firstCard = 'Source: ADMINISTRATOR, DIKUOriginal version';
    const secondCard = 'Source: ADMINISTRATOR, DIKUCurrent versionApprovednextPolNumber';
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    OrderLines.openVersionHistory();
    OrderLines.checkVersionHistoryCard(firstCard);
    OrderLines.checkVersionHistoryCard(secondCard);
    OrderLines.closeVersionHistory();
    Orders.editOrder();
  });
});
