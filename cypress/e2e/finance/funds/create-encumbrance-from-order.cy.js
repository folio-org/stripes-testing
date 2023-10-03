/* eslint-disable cypress/no-unnecessary-waiting */
import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import InteractorsTools from '../../../support/utils/interactorsTools';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Orders from '../../../support/fragments/orders/orders';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Parallelization from '../../../support/dictionary/parallelization';

describe('ui-finance: Transactions', () => {
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const allocatedQuantity = '100';
  let user;
  let orderNumber;
  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
    });
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
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
    });
    cy.createTempUser([
      permissions.uiFinanceViewEditDeletFundBudget.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.unOpenOrder();
    OrderLines.selectPOLInOrder(0);
    OrderLines.deleteOrderLine();
    // Need to wait few seconds, that data will be deleted
    cy.wait(2000);
    Orders.deleteOrderViaApi(order.id);
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    // Need to wait few seconds, that data will be deleted(its need to pass test in Jenkins run)
    cy.wait(2500);
    Funds.deleteFundViaApi(defaultFund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6705 Create encumbrance from Order  (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet, Parallelization.nonParallel] },
    () => {
      Orders.createPOLineViaActions();
      OrderLines.fillInPOLineInfoWithFund(defaultFund);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully opened`,
      );
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.checkOrderInTransactionList(defaultFund.code, '($20.00)');
    },
  );
});
