import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Budgets from '../../support/fragments/finance/budgets/budgets';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
    approved: true,
    reEncumber: true,
  };
  defaultFiscalYear.code = defaultFiscalYear.code.slice(0, -1) + '1';
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let location;
  let servicePointId;
  let user;
  let firstOrderNumber;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          cy.wait(2000);
          Budgets.createViaApi(firstBudget);
        });
        cy.getAdminToken();
        Funds.createViaApi(secondFund).then((secondFundResponse) => {
          secondFund.id = secondFundResponse.fund.id;
          secondBudget.fundId = secondFundResponse.fund.id;
          cy.wait(2000);
          Budgets.createViaApi(secondBudget);
        });
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
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

        cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
        Orders.createApprovedOrderForRollover(defaultOrder, true, false).then(
          (firstOrderResponse) => {
            defaultOrder.id = firstOrderResponse.id;
            firstOrderNumber = firstOrderResponse.poNumber;
            Orders.checkCreatedOrder(defaultOrder);
            OrderLines.addPOLine();
            OrderLines.selectRandomInstanceInTitleLookUP(item.instanceName, 0);
            OrderLines.POLWithDifferntCurrency(
              firstFund,
              '10',
              '1',
              '10',
              location.name,
              'Euro (EUR)',
              '€',
              '2',
            );
            OrderLines.backToEditingOrder();
            Orders.openOrder();
            cy.wait(4000);
            TopMenuNavigation.openAppFromDropdown('Invoices');
            Invoices.createRolloverInvoice(invoice, organization.name);
            Invoices.createInvoiceLineFromPol(firstOrderNumber);
            cy.wait(4000);
            Invoices.differentCurrencyConfirmation();
          },
        );
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiOrdersView.gui,
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
    'C378881 Update exchange rates on invoice lines with multiple funds (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C378881'] },
    () => {
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.deleteFundInInvoiceLineWithoutSave();
      Invoices.addFundToLineWithoutSaveInPercentage(0, firstFund, '30');
      Invoices.addFundToLineWithoutSaveInPercentage(1, secondFund, '70');
      Invoices.saveLine();
      Invoices.approveInvoice();
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '€0.00',
        `${firstOrderNumber}-1`,
        'Encumbrance',
        `${firstFund.name} (${firstFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
      Funds.checkInitialEncumbranceDetails('$20.00');
      Funds.checkAwaitingPaymentDetails('$3.00');
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(secondFund.name);
      Funds.selectFund(secondFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$7.00',
        invoice.invoiceNumber,
        'Pending payment',
        `${secondFund.name} (${secondFund.code})`,
      );
    },
  );
});
