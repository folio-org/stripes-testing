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
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';
import { Permissions } from '../../support/dictionary';

describe('Invoices', { retries: { runMode: 1 } }, () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.get3DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const defaultFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const firstExpenseClass = { ...NewExpenseClass.defaultUiBatchGroup };
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getCurrentDateInPreviusMonthForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();
  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.expenseClassesPath);
    SettingsFinance.createNewExpenseClass(firstExpenseClass);
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.editBudget();
          Funds.addExpensesClass(firstExpenseClass.name);
        });
        secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
        FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
          secondFiscalYear.id = secondFiscalYearResponse.id;
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
        Orders.createApprovedOrderForRollover(defaultOrder, false, false).then(
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
              location.name,
            );
            OrderLines.backToEditingOrder();
            Orders.openOrder();
          },
        );

        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(defaultLedger.name);
        Ledgers.selectLedger(defaultLedger.name);
        Ledgers.rollover();
        Ledgers.fillInCommonRolloverInfoWithCloseAllBudgets(
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

        cy.visit(TopMenu.fundPath);
        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.selectPreviousBudgetDetailsByFY(defaultFund, firstFiscalYear);
        Funds.editBudget();
        Funds.changeStatusOfBudget('Active', defaultFund, firstFiscalYear);
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
      permissions.uiOrdersView.gui,
      Permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.settingsInvoiveApprovalPath,
        waiter: SettingsInvoices.waitApprovalsLoading,
      });
      SettingsInvoices.uncheckApproveAndPayCheckboxIfChecked();
      cy.visit(TopMenu.ordersPath);
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C396361 Approve and pay invoice created in current FY for previous FY when related order line was created in previous Fiscal Year (thunderjet) (TaaS)',
    { tags: ['criticalPathFlaky', 'thunderjet', 'C396361'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(invoice, firstFiscalYear.code);
      Invoices.approveInvoice();
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
    },
  );
});
