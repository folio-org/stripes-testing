import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import { InvoiceView } from '../../support/fragments/invoices';
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
import Approvals from '../../support/fragments/settings/invoices/approvals';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-time',
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const firstExpenseClass = { ...NewExpenseClass.defaultUiBatchGroup };
  const allocatedQuantity = '100';
  defaultFiscalYear.code = defaultFiscalYear.code.slice(0, -1) + '1';
  let user;
  let orderNumber;
  let servicePointId;
  let location;
  const isApprovePayDisabled = false;

  before(() => {
    cy.loginAsAdmin({
      path: SettingsMenu.expenseClassesPath,
      waiter: SettingsFinance.waitExpenseClassesLoading,
      authRefresh: true,
    });
    Approvals.setApprovePayValueViaApi(isApprovePayDisabled);
    SettingsFinance.createNewExpenseClass(firstExpenseClass);
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.visit(TopMenu.fundPath);
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
        Orders.createApprovedOrderForRollover(defaultOrder, true, true).then(
          (firstOrderResponse) => {
            defaultOrder.id = firstOrderResponse.id;
            orderNumber = firstOrderResponse.poNumber;
            Orders.checkCreatedOrder(defaultOrder);
            OrderLines.addPOLine();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 1);
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
        cy.visit(TopMenu.invoicesPath);
        Invoices.createRolloverInvoiceWithFY(invoice, organization.name, defaultFiscalYear);
      });
    });

    cy.createTempUser([
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
        authRefresh: true,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C397330 User is not able to pay previously approved invoice when related order was unopened (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C397330'] },
    () => {
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.createInvoiceLineFromPol(orderNumber);
      Invoices.approveInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPOLFromInvoiceLineInCurrentPage(`${orderNumber}-1`);
      OrderLines.viewPO();
      Orders.unOpenOrderAndDeleteItems();
      Orders.selectInvoiceInRelatedInvoicesList(invoice.invoiceNumber);
      InvoiceView.checkInvoiceCanNotBeApprovedWarning();
      Invoices.checkPayButtonIsDissabled();
    },
  );
});
