import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewExpenseClass from '../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../support/fragments/settings/finance/settingsFinance';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_2_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const thirdFiscalYear = {
    name: `autotest_3_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.get5DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get7DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
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
  const firstExpenseClass = { ...NewExpenseClass.defaultUiBatchGroup };
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getCurrentDateInPreviusMonthForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.get2DaysAfterTomorrowDateForFiscalYearOnUIEdit();
  const periodStartForThirdFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForThirdFY = DateTools.get2DaysAfterTomorrowDateForFiscalYearOnUIEdit();
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.expenseClassesPath,
      waiter: SettingsFinance.waitExpenseClassesLoading,
    });
    SettingsFinance.createNewExpenseClass(firstExpenseClass);

    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin();
          TopMenuNavigation.openAppFromDropdown('Finance');
          FinanceHelp.selectFundsNavigation();
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.editBudget();
          Funds.addExpensesClass(firstExpenseClass.name);
          Funds.closeBudgetDetails();
          Funds.closeFundDetails();
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
        TopMenuNavigation.openAppFromDropdown('Orders');
        Orders.selectOrdersPane();
        Orders.createApprovedOrderForRollover(defaultOrder, true).then((firstOrderResponse) => {
          defaultOrder.id = firstOrderResponse.id;
          orderNumber = firstOrderResponse.poNumber;
          Orders.checkCreatedOrder(defaultOrder);
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
          OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
            defaultFund,
            '110',
            '1',
            '110',
            location.name,
          );
          OrderLines.backToEditingOrder();
          Orders.openOrder();
        });

        secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
        thirdFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '3';
        FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
          secondFiscalYear.id = secondFiscalYearResponse.id;
        });

        FiscalYears.createViaApi(thirdFiscalYear).then((thirdFiscalYearResponse) => {
          thirdFiscalYear.id = thirdFiscalYearResponse.id;
        });

        TopMenuNavigation.openAppFromDropdown('Finance');
        FinanceHelp.selectLedgersNavigation();

        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfoWithoutCheckboxOneTimeOrders(
          secondFiscalYear.code,
          'None',
          'Allocation',
        );
      });
    });

    FinanceHelp.selectFiscalYearsNavigation();
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
      permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C388645 Save invoice fiscal year after fund distribution change if FY was undefined and pay invoice against previous FY (thunderjet) (TaaS)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C388645'] },
    () => {
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(orderNumber);
      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.approveInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '($110.00)',
        `${orderNumber}-1`,
        'Pending payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionApp(defaultFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($110.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');

      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelp.selectLedgersNavigation();
      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.rollover();
      Ledgers.fillInCommonRolloverInfoWithoutCheckboxOneTimeOrders(
        thirdFiscalYear.code,
        'None',
        'Allocation',
      );

      FinanceHelp.selectFiscalYearsNavigation();
      FinanceHelp.searchByName(secondFiscalYear.name);
      FiscalYears.selectFY(secondFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForFirstFY,
        periodEndForFirstFY,
      );
      FinanceHelp.searchByName(thirdFiscalYear.name);
      FiscalYears.selectFY(thirdFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForThirdFY,
        periodEndForThirdFY,
      );

      TopMenuNavigation.navigateToApp('Invoices');
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$0.00');
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '($110.00)',
        `${orderNumber}-1`,
        'Payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionApp(defaultFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectPreviousBudgetDetailsByFY(defaultFund, firstFiscalYear);
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($110.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.closeTransactionApp(defaultFund, firstFiscalYear);
      Funds.closeBudgetDetails();
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        thirdFiscalYear.code,
        '($110.00)',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
    },
  );
});
