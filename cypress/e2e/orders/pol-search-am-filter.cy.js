import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingOrdersNavigationMenu from '../../support/fragments/settings/orders/settingOrdersNavigationMenu';

Cypress.on('uncaught:exception', () => false);

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
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
        ],
      };
      const integrationName = `FirstIntegrationName${getRandomPostfix()}`;
      const integartionDescription = 'Test Integation descripton1';
      const vendorEDICodeFor1Integration = getRandomPostfix();
      const libraryEDICodeFor1Integration = getRandomPostfix();
      let user;
      let orderNumber = null;

      before(() => {
        cy.loginAsAdmin({ path: TopMenu.organizationsPath, waiter: Organizations.waitLoading });
        Organizations.createOrganizationViaApi(organization).then((organizationResponse) => {
          organization.id = organizationResponse;
          order.vendor = organization.name;
          order.orderType = 'One-time';
          Organizations.searchByParameters('Name', organization.name);
          Organizations.checkSearchResults(organization);
          Organizations.selectOrganization(organization.name);
          Organizations.addIntegration();
          Organizations.fillIntegrationInformationWithoutScheduling(
            integrationName,
            integartionDescription,
            vendorEDICodeFor1Integration,
            libraryEDICodeFor1Integration,
            organization.accounts[0].accountNo,
            'Purchase',
          );
          InteractorsTools.checkCalloutMessage('Integration was saved');
          TopMenuNavigation.openAppFromDropdown('Settings');
          SettingsMenu.selectOrders();
          SettingOrdersNavigationMenu.selectPurchaseOrderLinesLimit();
          SettingsOrders.waitLoadingPurchaseOrderLinesLimit();
          SettingsOrders.setPurchaseOrderLinesLimit(3);
          cy.visit(TopMenu.ordersPath);
          order.orderType = 'Ongoing';
          Orders.createOrder(order, true, false).then((orderId) => {
            order.id = orderId;
            Orders.createPOLineViaActions();
            OrderLines.fillInPOLineInfoForExport('Purchase');
            cy.wait(4000);
            OrderLines.backToEditingOrder();
            Orders.createPOLineViaActions();
            OrderLines.fillInPOLineInfoForExport('Purchase at vendor system');
            cy.wait(4000);
            OrderLines.backToEditingOrder();
            Orders.createPOLineViaActions();
            OrderLines.fillInPOLineInfoForExport('Depository');
            cy.wait(4000);
            Orders.getOrdersApi({ limit: 1, query: `"id"=="${orderId}"` }).then((response) => {
              orderNumber = response[0].poNumber;
            });
          });
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
        ]).then((userProperties) => {
          user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.orderLinesPath,
              waiter: OrderLines.waitLoading,
            });
            cy.reload();
          }, 20_000);
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
        Users.deleteViaApi(user.userId);
      });

      it(
        'C350603 Searching POL by specifying acquisition method (thunderjet)',
        { tags: ['smoke', 'thunderjet', 'eurekaPhase1'] },
        () => {
          Orders.selectOrdersPane();
          Orders.selectFilterAcquisitionMethod('Purchase');
          Orders.checkOrderlineSearchResults(`${orderNumber}-1`);
          Orders.resetFilters();
          Orders.selectFilterAcquisitionMethod('Purchase at vendor system');
          Orders.checkOrderlineSearchResults(`${orderNumber}-2`);
          Orders.resetFilters();
          Orders.selectFilterAcquisitionMethod('Depository');
          Orders.checkOrderlineSearchResults(`${orderNumber}-3`);
          Orders.resetFilters();
        },
      );
    });
  });
});
