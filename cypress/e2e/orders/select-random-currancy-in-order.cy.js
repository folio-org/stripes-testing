import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import TestType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import Users from '../../support/fragments/users/users';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import SettingsMenu from '../../support/fragments/settingsMenu';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';

describe('orders: create an order', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const allocatedQuantity = '1000';
  let servicePointId;
  let location;
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });
    cy.visit(SettingsMenu.ordersPurchaseOrderLinesLimit);
    SettingsOrders.setPurchaseOrderLinesLimit(2);
    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  afterEach(() => {
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.ordersPurchaseOrderLinesLimit);
    SettingsOrders.setPurchaseOrderLinesLimit(1);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C8357 Create purchase order in foreign currency (thunderjet)',
    { tags: [TestType.smoke, devTeams.thunderjet] },
    () => {
      Orders.createOrder(order).then((orderId) => {
        order.id = orderId;
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
        OrderLines.fillPolWithEuroCurrency(defaultFund, '100', '1', location.institutionId);
        OrderLines.backToEditingOrder();
        Orders.createPOLineViaActions();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
        OrderLines.fillPolWithPLNCurrency(defaultFund, '100', '1', location.institutionId);
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        OrderLines.selectPOLInOrder(0);
        OrderLines.checkCurrencyInPOL();
        OrderLines.backToEditingOrder();
        OrderLines.selectPOLInOrder(1);
        OrderLines.checkCurrencyInPOL();
      });
    },
  );
});
