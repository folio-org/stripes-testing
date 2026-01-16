import permissions from '../../../support/dictionary/permissions';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import OrderLinesLimit from '../../../support/fragments/settings/orders/orderLinesLimit';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('Export Manager', () => {
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

      cy.loginAsAdmin({
        path: TopMenu.organizationsPath,
        waiter: Organizations.waitLoading,
      });
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
      OrderLinesLimit.setPOLLimitViaApi(2);

      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        TopMenuNavigation.openAppFromDropdown('Orders');
        Orders.selectOrdersPane();
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
        OrderLines.fillInPOLineInfoForExportWithLocationAndAccountNumber(
          'Purchase',
          location.name,
          `${organization.accounts[0].name} (${organization.accounts[0].accountNo})`,
        );
        Orders.backToPO();
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
        OrderLines.fillInPOLineInfoForExportWithLocationAndAccountNumber(
          'Purchase',
          location.name,
          `${organization.accounts[1].name} (${organization.accounts[1].accountNo})`,
        );
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
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      OrderLinesLimit.setPOLLimitViaApi(1);
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
      'C350410 Check if a User is alerted trying to open an Order with 2 POL, having more than 1 unique accounts for export (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C350410', 'shiftLeft'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        Orders.checkModalDifferentAccountNumbers();
      },
    );
  });
});
