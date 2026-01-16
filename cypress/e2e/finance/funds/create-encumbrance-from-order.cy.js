/* eslint-disable cypress/no-unnecessary-waiting */
import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Transactions', () => {
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = response;
    });
    FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
      defaultFiscalYear.id = defaultFiscalYearResponse.id;
      defaultBudget.fiscalYearId = defaultFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          defaultBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(defaultBudget);
        });
      });
    });

    cy.getAdminToken();
    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
    });
    cy.createTempUser([
      permissions.uiFinanceViewEditDeleteFundBudget.gui,
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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C6705 Create encumbrance from Order  (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C6705'] },
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
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$20.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
    },
  );
});
