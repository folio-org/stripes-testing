import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';
import TestTypes from '../../../support/dictionary/testTypes';
import Users from '../../../support/fragments/users/users';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../../support/utils/stringTools';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import DateTools from '../../../support/utils/dateTools';

Cypress.on('uncaught:exception', () => false);

describe('orders: Edifact export', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
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
  const integrationName1 = `FirstIntegrationName${getRandomPostfix()}`;
  const integartionDescription1 = 'Test Integation descripton1';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();
  const UTCTime = DateTools.getUTCDateForScheduling();
  let orderNumber;
  let user;
  let location;
  let servicePointId;

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
    cy.loginAsAdmin({ path:TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.selectOrganization(organization.name);
    Organizations.addIntegration();
    Organizations.fillIntegrationInformation(integrationName1, integartionDescription1, vendorEDICodeFor1Integration, libraryEDICodeFor1Integration, organization.accounts[0].accountNo, 'Purchase', UTCTime);

    cy.createOrderApi(order)
      .then((response) => {
        orderNumber = response.body.poNumber;
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList();
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
        OrderLines.fillInPOLineInfoForExportWithLocation(`${organization.accounts[0].name} (${organization.accounts[0].accountNo})`, 'Purchase', location.institutionId);
        OrderLines.backToEditingOrder();
      });

    cy.createTempUser([
      permissions.uiOrdersDelete.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
      });
  });

  after(() => {
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.ordersPurchaseOrderLinesLimit);
    Organizations.deleteOrganizationViaApi(organization.id);
    NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
      location.institutionId,
      location.campusId,
      location.libraryId,
      location.id
    );
    Users.deleteViaApi(user.userId);
  });

  it('C350404: Verify that User can delete created Order (thunderjet)', { tags: [TestTypes.criticalPath, devTeams.thunderjet] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList();
    Orders.deleteOrderViaActions();
    InteractorsTools.checkCalloutMessage(`The purchase order ${orderNumber} was successfully deleted`);
  });
});
