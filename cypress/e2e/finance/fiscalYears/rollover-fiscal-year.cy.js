import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import DateTools from '../../../support/utils/dateTools';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';

describe('ui-finance: Funds', () => {

  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = { 
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getPreviousDayDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
    periodStart: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getDayAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
};
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = { ...NewOrder.defaultOneTimeOrder ,
    orderType: "Ongoing",
    reEncumber: true,
};
  const secondOrder = { 
    orderType: "Ongoing",
    vendor: '',
    reEncumber: true,
   };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstOrderLineTitle = `autotest_POL_title_${getRandomPostfix()}`;
  const secondOrderLineTitle = `autotest_POL_title_${getRandomPostfix()}`;
  const allocatedQuantity = '1000';
  let user;

  before(() => {

    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear)
      .then(firstFiscalYearResponse => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;

        Ledgers.createViaApi(defaultLedger)
          .then(ledgerResponse => {
            defaultLedger.id = ledgerResponse.id;
            firstFund.ledgerId = defaultLedger.id;
            secondFund.ledgerId = defaultLedger.id;

            Funds.createViaApi(firstFund)
              .then(fundResponse => {
                firstFund.id = fundResponse.fund.id;

                cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
                FinanceHelp.searchByName(firstFund.name);
                FinanceHelp.selectFromResultsList();
                Funds.addBudget(allocatedQuantity);
              });

            Funds.createViaApi(secondFund)
              .then(secondFundResponse => {
                secondFund.id = secondFundResponse.fund.id;

                cy.visit(TopMenu.fundPath);
                FinanceHelp.searchByName(secondFund.name);
                FinanceHelp.selectFromResultsList();
                Funds.addBudget(allocatedQuantity);
              });
          });
      });
      // Create second Fiscal Year for Rollover
      FiscalYears.createViaApi(secondFiscalYear)
      .then(secondFiscalYearResponse => {
        secondFiscalYear.id = secondFiscalYearResponse.id;
      });
      
      // Prepare 2 Open Orders for Rollover
      Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
      });
      firstOrder.vendor = organization.name;
      secondOrder.vendor = organization.name;
    //   order.orderType = 'Ongoing';
    cy.visit(TopMenu.ordersPath);
      Orders.createOrder(firstOrder).then(firstOrderId => {
        firstOrder.id = firstOrderId;
        Orders.checkCreatedOrder(firstOrder);
        OrderLines.addPOLine();
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(firstOrderLineTitle, firstFund, '100' , '1', '100');
        OrderLines.backToEditingOrder();
        Orders.openOrder();
      });
      cy.visit(TopMenu.ordersPath);
      Orders.createOrder(secondOrder).then(secondOrderId => {
        secondOrder.id = secondOrderId;
        Orders.checkCreatedOrder(secondOrder);
        OrderLines.addPOLine();
        OrderLines.rolloverPOLineInfoforElectronicResourceWithFund(secondOrderLineTitle, secondFund, '200' , '1', '200');
        OrderLines.backToEditingOrder();
        Orders.openOrder();
      });
      
    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, { path:TopMenu.ledgerPath, waiter: Ledgers.waitForLedgerDetailsLoading });
      });
  });

  after(() => {
    Orders.deleteOrderApi(firstOrder.id);
    Orders.deleteOrderApi(secondOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(firstFund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(secondFund.name);
    FinanceHelp.selectFromResultsList();
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    Funds.checkIsBudgetDeleted();
    Funds.deleteFundViaApi(firstFund.id);
    Funds.deleteFundViaApi(secondFund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
    FiscalYears.deleteFiscalYearViaApi(secondFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it('C186156 Rollover Fiscal Year (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    FinanceHelp.searchByName(defaultLedger.name);
    FinanceHelp.selectFromResultsList();
    Ledgers.rollover();
  });
});
