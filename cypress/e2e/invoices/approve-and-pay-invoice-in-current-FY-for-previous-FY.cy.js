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
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getCurrentDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.getDayAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
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
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();
  let user;
  let orderNumber;
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
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
        secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
        FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
          secondFiscalYear.id = secondFiscalYearResponse.id;
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
    Orders.createOrderForRollover(defaultOrder).then((firstOrderResponse) => {
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
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesPayInvoicesInDifferentFiscalYear.gui,
      permissions.uiOrdersView.gui,
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
    'C388526 Approve and pay invoice created in current FY for previous FY when related order line was created in current FY (thunderjet) (TaaS)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList();
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrder(invoice, firstFiscalYear.code);
      Invoices.approveInvoice();
      Invoices.payInvoice();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectPreviousBudgetDetails();
      Funds.openTransactions();
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        firstFiscalYear.code,
        '($10.00)',
        invoice.invoiceNumber,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();
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
