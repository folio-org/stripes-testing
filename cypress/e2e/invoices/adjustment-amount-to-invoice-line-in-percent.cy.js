import permissions from '../../support/dictionary/permissions';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
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
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('Invoices', () => {
  const order = { ...NewOrder.defaultOngoingTimeOrder, approved: true, reEncumber: true };
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
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const allocatedQuantityForFistFund = '100';
  const adjustmentDescription = `test_description${getRandomPostfix()}`;
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

    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(firstFund.name);
          Funds.selectFund(firstFund.name);
          Funds.addBudget(allocatedQuantityForFistFund);
        });
      });
    });

    cy.createOrderApi(order).then((response) => {
      orderNumber = response.body.poNumber;
      TopMenuNavigation.openAppFromDropdown('Orders');
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.addPOLine();
      OrderLines.fillInPOLineInfoWithFund(firstFund);
      OrderLines.backToEditingOrder();
      Orders.openOrder();
      TopMenuNavigation.openAppFromDropdown('Invoices');
      Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
      Invoices.createInvoiceLinePOLLookUp(orderNumber);
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
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
    'C375999 Approve and pay invoice with added adjustment % to invoice line (not prorated, related to total as "In addition to") (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'shiftLeft'] },
    () => {
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.addAdjustment(adjustmentDescription, '10', '%', 'In addition to');
      Invoices.approveInvoice();
      Invoices.payInvoice();

      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.checkPaymentInTransactionDetails(
        2,
        defaultFiscalYear.code,
        invoice.invoiceNumber,
        `${firstFund.name} (${firstFund.code})`,
        '($22.00)',
      );
    },
  );
});
