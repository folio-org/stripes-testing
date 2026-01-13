import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../support/fragments/invoices/invoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';

describe('Invoices', () => {
  const order = { ...NewOrder.defaultOngoingTimeOrder, approved: false, reEncumber: true };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    addresses: [
      {
        addressLine1: '1 Centerpiece Blvd.',
        addressLine2: 'P.O. Box 15550',
        city: 'New Castle',
        stateRegion: 'DE',
        zipCode: '19720-5550',
        country: 'USA',
        isPrimary: true,
        categories: [],
        language: 'English',
      },
    ],
  };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
  };
  let user;
  let orderNumber;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
      order.vendor = organization.id;
    });
    invoice.accountingCode = organization.erpCode;
    invoice.vendorName = organization.name;
    Object.assign(
      vendorPrimaryAddress,
      organization.addresses.find((address) => address.isPrimary === true),
    );
    invoice.batchGroup = 'FOLIO';
    FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
      defaultFiscalYear.id = defaultFiscalYearResponse.id;
      firstBudget.fiscalYearId = defaultFiscalYearResponse.id;
      secondBudget.fiscalYearId = defaultFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);
          });
          cy.createOrderApi(order).then((response) => {
            orderNumber = response.body.poNumber;
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersView.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsInvoiveApprovalPath,
        waiter: SettingsInvoices.waitApprovalsLoading,
        authRefresh: true,
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
    'C353596 Invoice payment is successful if order line fund distribution is changed before invoice approval (thunderjet)',
    { tags: ['criticalPathFlaky', 'thunderjet', 'C353596'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.fillInPOLineInfoWithFund(firstFund);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      Orders.closeThirdPane();
      Orders.resetFilters();
      TopMenuNavigation.navigateToApp('Invoices');
      Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
      Invoices.createInvoiceLinePOLLookUp(orderNumber);
      TopMenuNavigation.navigateToApp('Orders');
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.changeFundInPOL(secondFund);
      cy.wait(3000);
      TopMenuNavigation.navigateToApp('Invoices');
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.approveInvoice();
      Invoices.payInvoice();
    },
  );
});
