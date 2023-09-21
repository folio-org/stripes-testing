import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../support/fragments/topMenu';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Users from '../../support/fragments/users/users';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import Invoices from '../../support/fragments/invoices/invoices';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import NewExpenceClass from '../../support/fragments/settings/finance/newExpenseClass';
import SettingsFinance from '../../support/fragments/settings/finance/settingsFinance';
import SettingsMenu from '../../support/fragments/settingsMenu';

describe('Invoices', () => {
  const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const firstOrder = { ...NewOrder.defaultOneTimeOrder, approved: true, reEncumber: true };
  const firstExpenseClass = { ...NewExpenceClass.defaultUiBatchGroup };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  let user;
  let firstOrderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.expenseClassesPath);
    SettingsFinance.createNewExpenseClass(firstExpenseClass);

    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
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
      invoice.accountingCode = organization.erpCode;
      firstOrder.orderType = 'One-time';
      firstOrder.vendor = organization.name;
      cy.visit(TopMenu.ordersPath);
      Orders.createOrderForRollover(firstOrder, true).then((secondOrderResponse) => {
        firstOrder.id = secondOrderResponse.id;
        firstOrderNumber = secondOrderResponse.poNumber;
        Orders.checkCreatedOrder(firstOrder);
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          defaultFund,
          '40',
          '1',
          '40',
          location.institutionId,
        );
        OrderLines.backToEditingOrder();
        Orders.openOrder();
      });
    });

    cy.createTempUser([
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesPayInvoices.gui,
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
    'C15859 Pay an invoice with multiple "Expense classes" assigned to it (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      cy.visit(TopMenu.invoicesPath);
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(firstOrderNumber);
      Invoices.approveInvoice();
      Invoices.payInvoice();
    },
  );
});
