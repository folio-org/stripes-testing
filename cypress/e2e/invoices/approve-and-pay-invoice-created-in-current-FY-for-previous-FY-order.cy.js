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
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import NewExpenceClass from '../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../support/fragments/settings/finance/settingsFinance';
import SettingsMenu from '../../support/fragments/settingsMenu';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';

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
  const forthFiscalYear = {
    name: `autotest_4_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(4)}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(6)}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };
  const defaultFund = { ...Funds.defaultUiFund };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    status: 'Inactive',
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const firstExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getCurrentDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.get2DaysAfterTomorrowDateForFiscalYearOnUIEdit();
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.expenseClassesPath);
    SettingsFinance.createNewExpenseClass(firstExpenseClass);
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
        organization.id = responseOrganizations;
        invoice.accountingCode = organization.erpCode;
        cy.getBatchGroups().then((batchGroup) => {
          invoice.batchGroup = batchGroup.name;
        });
      });

      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      thirdFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '3';
      forthFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '4';
      FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
        secondFiscalYear.id = secondFiscalYearResponse.id;
      });

      FiscalYears.createViaApi(thirdFiscalYear).then((thirdFiscalYearResponse) => {
        thirdFiscalYear.id = thirdFiscalYearResponse.id;
      });

      FiscalYears.createViaApi(forthFiscalYear).then((forthFiscalYearResponse) => {
        forthFiscalYear.id = forthFiscalYearResponse.id;
      });

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.editBudget();
          Funds.addExpensesClass(firstExpenseClass.name);
        });

        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfoWithoutCheckboxOngoingEncumbrances(
          secondFiscalYear.code,
          'None',
          'Allocation',
        );
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
        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfoWithoutCheckboxOngoingEncumbrances(
          thirdFiscalYear.code,
          'None',
          'Allocation',
        );

        cy.visit(TopMenu.fiscalYearPath);
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
          periodStartForSecondFY,
          periodEndForSecondFY,
        );
        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfoWithoutCheckboxOngoingEncumbrances(
          forthFiscalYear.code,
          'None',
          'Allocation',
        );

        cy.visit(TopMenu.fiscalYearPath);
        FinanceHelp.searchByName(thirdFiscalYear.name);
        FiscalYears.selectFY(thirdFiscalYear.name);
        FiscalYears.editFiscalYearDetails();
        FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
          periodStartForFirstFY,
          periodEndForFirstFY,
        );
        FinanceHelp.searchByName(forthFiscalYear.name);
        FiscalYears.selectFY(forthFiscalYear.name);
        FiscalYears.editFiscalYearDetails();
        FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
          periodStartForSecondFY,
          periodEndForSecondFY,
        );
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
      permissions.uiOrganizationsViewEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C388564 Approve and pay invoice created in current FY for previous FY without related order (thunderjet) (TaaS)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Invoices.createRolloverInvoiceWithFY(invoice, organization.name, firstFiscalYear);
      Invoices.createInvoiceLineWithFund(invoiceLine, defaultFund);
      Invoices.checkApproveButtonIsDissabled();

      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.clickOnOrganizationFromInvoice(organization.name);

      organization.status = 'Active';
      Organizations.editOrganization();
      Organizations.changeOrganizationStatus(organization.status);

      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.approveInvoice();
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance(`${defaultFund.name}(${defaultFund.code})`);

      Funds.selectPreviousBudgetDetailsByFY(defaultFund, firstFiscalYear);
      Funds.viewTransactions();
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($2.00)',
        invoice.invoiceNumber,
        'Payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionApp(defaultFund, firstFiscalYear);
      Funds.closeBudgetDetails();

      Funds.selectPreviousBudgetDetailsByFY(defaultFund, firstFiscalYear);
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      Funds.checkNoTransactionOfType('Pending payment');
      Funds.checkNoTransactionOfType('Expended');
      Funds.closeTransactionApp(defaultFund, firstFiscalYear);
      Funds.closeBudgetDetails();

      Funds.selectPreviousBudgetDetailsByFY(defaultFund, secondFiscalYear);
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      Funds.checkNoTransactionOfType('Pending payment');
      Funds.checkNoTransactionOfType('Expended');
      Funds.closeTransactionApp(defaultFund, secondFiscalYear);
      Funds.closeBudgetDetails();

      Funds.selectPreviousBudgetDetailsByFY(defaultFund, thirdFiscalYear);
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      Funds.checkNoTransactionOfType('Pending payment');
      Funds.checkNoTransactionOfType('Expended');
      Funds.closeTransactionApp(defaultFund, thirdFiscalYear);
      Funds.closeBudgetDetails();

      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.checkNoTransactionOfType('Encumbrance');
      Funds.checkNoTransactionOfType('Pending payment');
      Funds.checkNoTransactionOfType('Expended');
    },
  );
});
