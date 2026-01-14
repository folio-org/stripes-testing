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

describe('Invoices', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const firstOrder = { ...NewOrder.defaultOneTimeOrder, approved: true, reEncumber: true };
  const firstExpenseClass = { ...NewExpenseClass.defaultUiBatchGroup };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const allocatedQuantity = '100';
  let user;
  let firstOrderNumber;
  let servicePointId;
  let location;

  before(() => {
    cy.getAdminToken();
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

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
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
      Orders.createApprovedOrderForRollover(firstOrder, true).then((secondOrderResponse) => {
        firstOrder.id = secondOrderResponse.id;
        firstOrderNumber = secondOrderResponse.poNumber;
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 15);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          defaultFund,
          '40',
          '1',
          '40',
          location.name,
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
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C15859 Pay an invoice with multiple "Expense classes" assigned to it (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C15859'] },
    () => {
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLineFromPol(firstOrderNumber);
      Invoices.approveInvoice();
      Invoices.payInvoice();
    },
  );
});
