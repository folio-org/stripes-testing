import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../support/utils/interactorsTools';
import Groups from '../../support/fragments/finance/groups/groups';
import Orders from '../../support/fragments/orders/orders';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderLines from '../../support/fragments/orders/orderLines';
import basicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('ui-finance: Groups', () => {
  const defaultFUnd = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const allocatedQuantity = '50';
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const orderLineTitle = basicOrderLine.defaultOrderLine.titleOrPackage;
  let user;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
      });
    order.vendor = organization.name;
    order.orderType = 'One-time';
    FiscalYears.createViaApi(defaultFiscalYear)
      .then(response => {
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

        Ledgers.createViaApi(defaultLedger)
          .then(ledgerResponse => {
            defaultLedger.id = ledgerResponse.id;
            defaultFUnd.ledgerId = defaultLedger.id;

            Funds.createViaApi(defaultFUnd)
              .then(fundResponse => {
                defaultFUnd.id = fundResponse.fund.id;

                cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
                FinanceHelp.searchByName(defaultFUnd.name);
                FinanceHelp.selectFromResultsList();
                Funds.addBudget(allocatedQuantity);
              });
          });
      });
    cy.createTempUser([
      permissions.uiCreateOrderAndOrderLine.gui,
      permissions.uiEditOrderAndOrderLine.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.ordersPath, waiter: .waitLoading });
      });
  });

  after(() => {
    cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(defaultFUnd.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaApi(defaultFUnd.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it('C658 Create an order and at least one order line for format = electronic resource  (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    Orders.createOrder(order).then(orderId => {
        order.id = orderId;
        Orders.checkCreatedOrder(order);
  
        OrderLines.addPOLine();
        OrderLines.POLineInfodorPhysicalMaterial(orderLineTitle);
        OrderLines.backToEditingOrder();
      });
  });
});
