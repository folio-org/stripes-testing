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
import getRandomPostfix from '../../support/utils/stringTools';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';

describe('Orders', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const thirdFund = {
    name: `autotest_fund3_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const forthFund = {
    name: `autotest_fund4_${getRandomPostfix()}`,
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
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const firstInvoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  let user;
  let orderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;
        thirdFund.ledgerId = defaultLedger.id;
        forthFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantity);
        });

        cy.getAdminToken();
        Funds.createViaApi(secondFund).then((secondFundResponse) => {
          secondFund.id = secondFundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(secondFund.name);
          Funds.selectFund(secondFund.name);
          Funds.addBudget(allocatedQuantity);
        });
        Funds.createViaApi(thirdFund).then((thirdFundResponse) => {
          thirdFund.id = thirdFundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(thirdFund.name);
          Funds.selectFund(thirdFund.name);
          Funds.addBudget(allocatedQuantity);
        });
        Funds.createViaApi(forthFund).then((forthFundResponse) => {
          forthFund.id = forthFundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
          FinanceHelp.searchByName(forthFund.name);
          Funds.selectFund(forthFund.name);
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

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      firstInvoice.accountingCode = organization.erpCode;
    });
    firstOrder.vendor = organization.name;
    cy.visit(TopMenu.ordersPath);
    Orders.createApprovedOrderForRollover(firstOrder, true).then((firstOrderResponse) => {
      firstOrder.id = firstOrderResponse.id;
      orderNumber = firstOrderResponse.poNumber;
      Orders.checkCreatedOrder(firstOrder);
      OrderLines.addPOLine();
      OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
      OrderLines.rolloverPOLineInfoforPhysicalMaterialWith2FundsInPercents(
        firstFund,
        '10',
        '1',
        '50',
        secondFund,
        '50',
        location.name,
      );
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      cy.visit(TopMenu.settingsInvoiveApprovalPath);
      SettingsInvoices.uncheckApproveAndPayCheckboxIfChecked();
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(firstInvoice, organization.name);
      Invoices.createInvoiceLineFromPol(orderNumber);
      // Need to wait, while data will be loaded
      cy.wait(4000);
      Invoices.approveInvoice();
      Invoices.payInvoice();
    });
    cy.createTempUser([
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C376957 Editing and adding fund distribution in PO line when PO line has more than one fund distributions and related Paid invoice exists (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C376957'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.changeFundInPOLWithoutSaveInPercents(0, thirdFund, '30');
      OrderLines.changeFundInPOLWithoutSaveInPercents(1, secondFund, '30');
      OrderLines.addFundToPOLWithoutSave(2, forthFund, '40');
      OrderLines.saveOrderLine();
      OrderLines.openPageCurrentEncumbranceInFund(
        `${secondFund.name}(${secondFund.code})`,
        '$0.00',
      );
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.checkExpendedInTransactionDetails('$5.00');
      Funds.checkInitialEncumbranceDetails('$3.00');

      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.openPageCurrentEncumbranceInFund(`${thirdFund.name}(${thirdFund.code})`, '$0.00');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${thirdFund.name} (${thirdFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.checkExpendedInTransactionDetails('$5.00');
      Funds.checkInitialEncumbranceDetails('$3.00');

      cy.visit(TopMenu.ordersPath);
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.openPageCurrentEncumbranceInFund(`${forthFund.name}(${forthFund.code})`, '$4.00');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$4.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${forthFund.name} (${forthFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.checkExpendedInTransactionDetails('$0.00');
      Funds.checkInitialEncumbranceDetails('$4.00');

      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(firstInvoice.invoiceNumber);
      Invoices.selectInvoice(firstInvoice.invoiceNumber);
      InvoiceView.selectInvoiceLine();
      Invoices.openPageFundInInvoiceLine(`${firstFund.name}(${firstFund.code})`);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '($5.00)',
        firstInvoice.invoiceNumber,
        'Payment',
        `${firstFund.name} (${firstFund.code})`,
      );
    },
  );
});
