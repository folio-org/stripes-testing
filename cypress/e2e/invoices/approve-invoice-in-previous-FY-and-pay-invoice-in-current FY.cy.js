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
import DateTools from '../../support/utils/dateTools';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';

describe('ui-finance: Fiscal Year Rollover', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_2_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getDayAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const thirdFiscalYear = {
    name: `autotest_3_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get2DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForEarlierFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();
  const periodStartForThirdFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForThirdFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();

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

        ServicePoints.getViaApi().then((servicePoint) => {
          servicePointId = servicePoint[0].id;
          NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
            location = res;
          });
        });

        Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
          organization.id = responseOrganizations;
          invoice.accountingCode = organization.erpCode;
          cy.getBatchGroups().then((batchGroup) => {
            invoice.batchGroup = batchGroup.name;
          });
        });
        defaultOrder.vendor = organization.name;
        cy.visit(TopMenu.ordersPath);
        Orders.createApprovedOrderForRollover(defaultOrder, true, false).then(
          (firstOrderResponse) => {
            defaultOrder.id = firstOrderResponse.id;
            orderNumber = firstOrderResponse.poNumber;
            Orders.checkCreatedOrder(defaultOrder);
            OrderLines.addPOLine();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
            OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
              defaultFund,
              '10',
              '1',
              '10',
              location.institutionId,
            );
            OrderLines.backToEditingOrder();
            Orders.openOrder();
          },
        );

        secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
        thirdFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '3';
        FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
          secondFiscalYear.id = secondFiscalYearResponse.id;
        });

        FiscalYears.createViaApi(thirdFiscalYear).then((thirdFiscalYearResponse) => {
          thirdFiscalYear.id = thirdFiscalYearResponse.id;
        });

        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfo(secondFiscalYear.code, 'None', 'Allocation');
      });
    });

    cy.visit(TopMenu.fiscalYearPath);
    FinanceHelp.searchByName(firstFiscalYear.name);
    FiscalYears.selectFY(firstFiscalYear.name);
    FiscalYears.editFiscalYearDetails();
    FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
      periodStartForFirstFY,
      periodEndForFirstFY,
    );
    FinanceHelp.searchByName(secondFiscalYear.name);
    FiscalYears.selectFY(secondFiscalYear.name);
    FiscalYears.editFiscalYearDetails();
    FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
      periodStartForSecondFY,
      periodEndForSecondFY,
    );

    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiFinanceViewEditFiscalYear.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiOrdersView.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C388538 Approve invoice in previous FY and pay invoice in current FY (for previous FY) (thunderjet) (TaaS)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(invoice, firstFiscalYear.code);
      Invoices.approveInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($10.00)',
        invoice.invoiceNumber,
        'Pending payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionApp(defaultFund, firstFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '($10.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
      cy.visit(TopMenu.ledgerPath);
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInCommonRolloverInfo(thirdFiscalYear.code, 'None', 'Allocation');

      cy.visit(TopMenu.fiscalYearPath);
      FinanceHelp.searchByName(secondFiscalYear.name);
      FiscalYears.selectFY(secondFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForFirstFY,
        periodEndForEarlierFirstFY,
      );
      FinanceHelp.searchByName(thirdFiscalYear.name);
      FiscalYears.selectFY(thirdFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForThirdFY,
        periodEndForThirdFY,
      );

      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($10.00)',
        invoice.invoiceNumber,
        'Payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionApp(defaultFund, firstFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetailsByFY(defaultFund, secondFiscalYear);
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '($10.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.closeTransactionApp(defaultFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        thirdFiscalYear.code,
        '($10.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
    },
  );
});
