import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('ui-finance: Fiscal Year Rollover', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get2DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
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
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const secondOrder = {
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '1000';
  let user;
  let firstOrderNumber;
  let secondOrderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantity);
        });

        Funds.createViaApi(secondFund).then((secondFundResponse) => {
          secondFund.id = secondFundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(secondFund.name);
          Funds.selectFund(secondFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    // Create second Fiscal Year for Rollover
    FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
      secondFiscalYear.id = secondFiscalYearResponse.id;
    });
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });

    // Prepare 2 Open Orders for Rollover
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
      secondOrder.orderType = 'One-time';
    });
    firstOrder.vendor = organization.name;
    secondOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      firstOrderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(firstOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        firstFund,
        '100',
        '1',
        '100',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      cy.visit(TopMenu.ordersPath);
      Orders.createApprovedOrderForRollover(secondOrder, true).then((secondOrderResponse) => {
        secondOrder.id = secondOrderResponse.id;
        secondOrderNumber = secondOrderResponse.poNumber;
        Orders.checkCreatedOrder(secondOrder);
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 20);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          secondFund,
          '200',
          '1',
          '200',
          location.name,
        );
        OrderLines.backToEditingOrder();
        Orders.openOrder();
      });
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(firstOrderNumber);
      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.approveInvoice();
      Invoices.payInvoice();
    });
    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it('C186156 Rollover Fiscal Year (thunderjet)', { tags: ['criticalPath', 'thunderjet'] }, () => {
    FinanceHelp.searchByName(defaultLedger.name);
    Ledgers.selectLedger(defaultLedger.name);
    Ledgers.rollover();
    Ledgers.fillInRolloverInfo(secondFiscalYear.code);
    Ledgers.closeRolloverInfo();
    Ledgers.selectFundInLedger(firstFund.name);
    Funds.selectPlannedBudgetDetails();
    Funds.viewTransactions();
    Funds.selectTransactionInList('Encumbrance');
    Funds.varifyDetailsInTransaction(
      secondFiscalYear.code,
      '($100.00)',
      `${firstOrderNumber}-1`,
      'Encumbrance',
      `${firstFund.name} (${firstFund.code})`,
    );
    Funds.closeTransactionDetails();
    Funds.closeMenu();
    cy.wait(1000);
    Funds.closeMenu();
    Funds.selectBudgetDetails();
    Funds.viewTransactions();
    Funds.selectTransactionInList('Encumbrance');
    Funds.varifyDetailsInTransaction(
      firstFiscalYear.code,
      '($0.00)',
      `${firstOrderNumber}-1`,
      'Encumbrance',
      `${firstFund.name} (${firstFund.code})`,
    );
    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(secondFund.name);
    Funds.selectFund(secondFund.name);
    Funds.selectPlannedBudgetDetails();
    Funds.viewTransactions();
    Funds.selectTransactionInList('Encumbrance');
    Funds.varifyDetailsInTransaction(
      secondFiscalYear.code,
      '($200.00)',
      `${secondOrderNumber}-1`,
      'Encumbrance',
      `${secondFund.name} (${secondFund.code})`,
    );
    Funds.closeTransactionDetails();
    Funds.closeMenu();
    cy.wait(1000);
    Funds.closeMenu();
    Funds.selectBudgetDetails();
    Funds.viewTransactions();
    Funds.selectTransactionInList('Encumbrance');
    Funds.varifyDetailsInTransaction(
      firstFiscalYear.code,
      '($200.00)',
      `${secondOrderNumber}-1`,
      'Encumbrance',
      `${secondFund.name} (${secondFund.code})`,
    );
  });
});
