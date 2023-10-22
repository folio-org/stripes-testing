import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import Orders from '../../../support/fragments/orders/orders';
import TestTypes from '../../../support/dictionary/testTypes';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import getRandomPostfix from '../../../support/utils/stringTools';
import OrderLines from '../../../support/fragments/orders/orderLines';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import SettingsOrders from '../../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

describe('Export Orders in EDIFACT format: Orders Export to a Vendor', () => {
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
        paymentMethod: 'EFT',
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
        paymentMethod: 'EFT',
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
  let user;
  let location;
  let servicePointId;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.ordersPurchaseOrderLinesLimit,
      waiter: SettingsOrders.waitLoadingPurchaseOrderLinesLimit,
    });
    SettingsOrders.setPurchaseOrderLinesLimit(2);

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
    cy.visit(TopMenu.organizationsPath);
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

    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
      OrderLines.fillInPOLineInfoForExportWithLocationAndAccountNumber(
        'Purchase',
        location.institutionId,
        `${organization.accounts[0].name} (${organization.accounts[0].accountNo})`,
      );
      OrderLines.backToEditingOrder();
      Orders.createPOLineViaActions();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
      OrderLines.fillInPOLineInfoForExportWithLocationAndAccountNumber(
        'Purchase',
        location.institutionId,
        `${organization.accounts[1].name} (${organization.accounts[1].accountNo})`,
      );
      OrderLines.backToEditingOrder();
    });

    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrganizationsViewEditCreate.gui,
      permissions.uiOrganizationsView.gui,
      permissions.uiExportOrders.gui,
      permissions.exportManagerAll.gui,
      permissions.exportManagerDownloadAndResendFiles.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
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
    'C350410: Check if a User is alerted trying to open an Order with 2 POL, having more than 1 unique accounts for export (thunderjet) (TaaS)',
    { tags: [TestTypes.smoke, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.openOrder();
      Orders.checkModalDifferentAccountNumbers();
    },
  );
});
