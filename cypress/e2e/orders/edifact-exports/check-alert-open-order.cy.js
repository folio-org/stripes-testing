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
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';

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
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout2',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const integrationName1 = `FirstIntegrationName${getRandomPostfix()}`;
  const integrationName2 = `SecondIntegrationName${getRandomPostfix()}`;
  const integartionDescription1 = 'Test Integation descripton1';
  const integartionDescription2 = 'Test Integation descripton2';
  const vendorEDICodeFor1Integration = getRandomPostfix();
  const libraryEDICodeFor1Integration = getRandomPostfix();
  const vendorEDICodeFor2Integration = getRandomPostfix();
  const libraryEDICodeFor2Integration = getRandomPostfix();
  const errorMessage =
    'This Order includes 2 unique account numbers for export. You can not open an order with more than one POL set to export if the POLs have different account numbers. Please edit account number information of these POLs or move POLs with different account numbers to different orders before opening';
  let orderNumber;
  let user;
  let location;
  let servicePointId;

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
    cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.selectOrganization(organization.name);
    Organizations.addIntegration();
    Organizations.fillIntegrationInformationWithoutScheduling(
      integrationName1,
      integartionDescription1,
      vendorEDICodeFor1Integration,
      libraryEDICodeFor1Integration,
      organization.accounts[0].accountNo,
      'Purchase',
    );
    Organizations.addIntegration();
    cy.wait(2000);
    Organizations.fillIntegrationInformationWithoutScheduling(
      integrationName2,
      integartionDescription2,
      vendorEDICodeFor2Integration,
      libraryEDICodeFor2Integration,
      organization.accounts[1].accountNo,
      'Purchase',
    );

    cy.visit(SettingsMenu.ordersPurchaseOrderLinesLimit);
    SettingsOrders.setPurchaseOrderLinesLimit(2);

    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
      OrderLines.fillInPOLineInfoForExportWithLocation('Purchase', location.institutionId);
      OrderLines.backToEditingOrder();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 2);
      OrderLines.fillInPOLineInfoForExportWithLocation(
        `${organization.accounts[1].name} (${organization.accounts[1].accountNo})`,
        'Purchase',
        location.institutionId,
      );
    });

    cy.createTempUser([
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.ordersPurchaseOrderLinesLimit);
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
    'C350410: Check if a User is alerted trying to open an Order with 2 POL, having more than 1 unique accounts for export (thunderjet)',
    { tags: [TestTypes.smoke, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.openOrder();
      Orders.errorMessage('Different account numbers', errorMessage);
    },
  );
});
