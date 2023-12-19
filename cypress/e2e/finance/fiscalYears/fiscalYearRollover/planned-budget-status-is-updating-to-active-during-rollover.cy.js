import permissions from '../../../../support/dictionary/permissions';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../../support/fragments/invoices/newInvoice';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('ui-finance: Fiscal Year Rollover', { retries: 3 }, () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCodeForRollover(2000, 9999),
    periodStart: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getDayAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const secondOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const firstOrder = {
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  const todayDate = DateTools.getCurrentDate();
  const fileNameDate = DateTools.getCurrentDateForFileNaming();
  let user;
  let firstOrderNumber;
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
    // Create second Fiscal Year for Rollover
    FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
      secondFiscalYear.id = secondFiscalYearResponse.id;
    });

    // Prepare 2 Open Orders for Rollover
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      invoice.accountingCode = organization.erpCode;
      firstOrder.orderType = 'One-time';
    });
    secondOrder.vendor = organization.name;
    firstOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createOrderForRollover(secondOrder).then((firstOrderResponse) => {
      secondOrder.id = firstOrderResponse.id;
      firstOrderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(secondOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 25);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
        defaultFund,
        '40',
        '1',
        '40',
        location.institutionId,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      cy.visit(TopMenu.ordersPath);
      Orders.createOrderForRollover(firstOrder).then((secondOrderResponse) => {
        firstOrder.id = secondOrderResponse.id;
        Orders.checkCreatedOrder(firstOrder);
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 35);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          defaultFund,
          '10',
          '1',
          '10',
          location.institutionId,
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

  it(
    'C359186: "Planned" budget status is updating to "Active" during FY rollover (based on "Expended") (TaaS)',
    { tags: ['extendedPath', 'thunderjet'] },
    () => {
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInTestRolloverInfoCashBalance(
        secondFiscalYear.code,
        'Cash balance',
        'Allocation',
      );
      Ledgers.rolloverLogs();
      Ledgers.exportRollover(todayDate);
      Ledgers.checkDownloadedFile(
        `${fileNameDate}-result.csv`,
        defaultFund,
        secondFiscalYear,
        '100',
        '100',
        '160',
        '160',
        '160',
        '160',
        '160',
      );
      Ledgers.deleteDownloadedFile(`${fileNameDate}-result.csv`);
      Ledgers.closeOpenedPage();
      Ledgers.rollover();
      Ledgers.fillInRolloverForCashBalance(secondFiscalYear.code, 'Cash balance', 'Allocation');
      Ledgers.closeRolloverInfo();
      Ledgers.selectFundInLedger(defaultFund.name);
      Funds.selectPlannedBudgetDetails();
      Funds.checkFundingInformation('$160.00', '$0.00', '$0.00', '$160.00', '$0.00', '$160.00');
      Funds.checkFinancialActivityAndOverages('$0.00', '$0.00', '$0.00', '$0.00');
    },
  );
});
