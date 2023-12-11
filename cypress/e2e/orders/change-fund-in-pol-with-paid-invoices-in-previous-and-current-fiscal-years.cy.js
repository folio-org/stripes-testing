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
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import getRandomPostfix from '../../support/utils/stringTools';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Orders', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const secondFiscalYear = {
    name: `autotest_year_${getRandomPostfix()}`,
    code: DateTools.getRandomFiscalYearCode(2000, 9999),
    periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    periodEnd: `${DateTools.get2DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
    description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
    series: 'FY',
  };
  const firstLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund_2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const secondInvoice = {
    status: 'Open',
    invoiceDate: DateTools.getCurrentDate(),
    vendorName: 'Amazon.com',
    accountingCode: '',
    batchGroup: '',
    invoiceNumber: FinanceHelp.getRandomInvoiceNumber(),
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const allocatedQuantity = '100';
  const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
  const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
  const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
  const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

  firstFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '1';
  let user;
  let servicePointId;
  let location;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = firstFiscalYear.id;
      secondFiscalYear.code = firstFiscalYear.code.slice(0, -1) + '2';
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;
        secondFund.ledgerId = firstLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantity);
          Funds.closeBudgetDetails();
        });
      });

      Funds.createViaApi(secondFund).then((secondfundResponse) => {
        secondFund.id = secondfundResponse.fund.id;
        cy.visit(TopMenu.fundPath);
        FinanceHelp.searchByName(secondFund.name);
        Funds.selectFund(secondFund.name);
        Funds.addBudget(allocatedQuantity);
        Funds.closeBudgetDetails();
      });

      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
          location = res;
        });
      });

      FiscalYears.createViaApi(secondFiscalYear).then((secondFiscalYearResponse) => {
        secondFiscalYear.id = secondFiscalYearResponse.id;
      });

      Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
        organization.id = responseOrganizations;
        invoice.accountingCode = organization.erpCode;
        secondInvoice.accountingCode = organization.erpCode;
        cy.getBatchGroups().then((batchGroup) => {
          invoice.batchGroup = batchGroup.name;
          secondInvoice.batchGroup = batchGroup.name;
        });
      });

      firstOrder.vendor = organization.name;

      cy.visit(TopMenu.ordersPath);
      Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
        firstOrder.id = firstOrderResponse.id;
        orderNumber = firstOrderResponse.poNumber;
        Orders.checkCreatedOrder(firstOrder);
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 9);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          firstFund,
          '10',
          '1',
          '10',
          location.institutionId,
        );
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        cy.visit(TopMenu.invoicesPath);
        Invoices.createRolloverInvoice(invoice, organization.name);
        Invoices.createInvoiceLineFromPol(orderNumber);
        // Need to wait, while data will be loaded
        cy.wait(4000);
        Invoices.approveInvoice();
        Invoices.payInvoice();
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.selectPOLInOrder(0);
        OrderLines.editPOLInOrder();
        OrderLines.changeFundInPOLWithoutSaveInPercents(0, secondFund, '100');
        OrderLines.saveOrderLine();

        cy.visit(TopMenu.ledgerPath);
        FinanceHelp.searchByName(firstLedger.name);
        Ledgers.selectLedger(firstLedger.name);
        Ledgers.rollover();
        Ledgers.fillInRolloverForOneTimeOrdersWithAllocation(
          secondFiscalYear.code,
          'None',
          'Transfer',
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
      });

      cy.createTempUser([
        permissions.viewEditCreateInvoiceInvoiceLine.gui,
        permissions.uiInvoicesApproveInvoices.gui,
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiInvoicesPayInvoices.gui,
        permissions.uiOrdersEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C404376: Change fund distribution when PO line has related paid invoices in previous and current fiscal years (thunderjet) (TaaS)',
    { tags: ['extended', 'thunderjet'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.openPageCurrentEncumbranceInFund(`${firstFund.name}(${firstFund.code})`, '$10.00');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$10.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');

      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.editFundInPOL(firstFund, '10', '10');
      OrderLines.backToEditingOrder();
      Orders.newInvoiceFromOrder();
      Invoices.createInvoiceFromOrderWithoutFY(secondInvoice);
      Invoices.approveInvoice();

      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.changeFundInPOLWithoutSaveInPercents(0, secondFund, '10');
      OrderLines.saveOrderLine();
      InteractorsTools.checkCalloutErrorMessage(
        'The purchase order line fund distribution can not be changed because the order line is linked to an invoice line that currently has the "approved" status',
      );
      OrderLines.cancelEditingPOL();

      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(secondInvoice.invoiceNumber);
      Invoices.selectInvoice(secondInvoice.invoiceNumber);
      Invoices.payInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageFundInInvoiceLine(`${firstFund.name}(${firstFund.code})`);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');

      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder();
      OrderLines.editPOLInOrder();
      OrderLines.editFundInPOL(secondFund, '10', '10');
      OrderLines.openPageCurrentEncumbrance('$0.00');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.closeTransactionApp(secondFund, secondFiscalYear);
      Funds.closeBudgetDetails();
      Funds.closeFundDetails();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        secondFiscalYear.code,
        '($10.00)',
        invoice.invoiceNumber,
        'Payment',
        `${firstFund.name} (${firstFund.code})`,
      );
    },
  );
});
