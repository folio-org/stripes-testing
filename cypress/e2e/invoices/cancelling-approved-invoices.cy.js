import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import Funds from '../../support/fragments/finance/funds/funds';
import Helper from '../../support/fragments/finance/financeHelper';
import Organizations from '../../support/fragments/organizations/organizations';
import SettingsMenu from '../../support/fragments/settingsMenu';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';
import Users from '../../support/fragments/users/users';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import SearchHelper from '../../support/fragments/finance/financeHelper';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('ui-invoices: Cancelling approved invoices', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
  const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const orderLineTitle = BasicOrderLine.defaultOrderLine.titleOrPackage;
  const allocatedQuantity = '100';
  const subtotalValue = 100;
  let user;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path:SettingsMenu.invoiceApprovalsPath, waiter: SettingsInvoices.waitApprovalsLoading });
    SettingsInvoices.checkApproveAndPayCheckboxIsDisabled();

    FiscalYears.createViaApi(defaultFiscalYear)
    .then(response => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger)
        .then(ledgerResponse => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(defaultFund)
            .then(fundResponse => {
              defaultFund.id = fundResponse.fund.id;

              cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
              FinanceHelp.searchByName(defaultFund.name);
              FinanceHelp.selectFromResultsList();
              Funds.addBudget(allocatedQuantity);
            });
        });
    });

    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
        order.vendor = response;
        invoice.accountingCode = organization.erpCode;
        
        cy.createOrderApi(order)
          .then((response) => {
            orderNumber = response.body.poNumber;
            cy.visit(TopMenu.ordersPath);
            Orders.searchByParameter('PO number', orderNumber);
            SearchHelper.selectFromResultsList();
            Orders.createPOLineViaActions();
            OrderLines.POLineInfodorPhysicalMaterialWithFund(orderLineTitle,defaultFund);
            interactorsTools.checkCalloutMessage('The purchase order line was successfully created');
        });
            Object.assign(vendorPrimaryAddress,
                organization.addresses.find(address => address.isPrimary === true));
                cy.getBatchGroups()
                  .then(batchGroup => { 
                    invoice.batchGroup = batchGroup.name;
                    invoiceLine.subTotal = -subtotalValue;
                    cy.visit(TopMenu.invoicesPath);
                    Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
                    Invoices.createInvoiceLine(invoiceLine);
                    Invoices.addFundDistributionToLine(invoiceLine, defaultFund);
                    Invoices.approveInvoice();
                });
    });
 
    cy.createTempUser([
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.viewEditDeleteInvoiceInvoiceLine.gui
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(userProperties.username, userProperties.password, { path:TopMenu.invoicesPath, waiter: Invoices.waitLoading });
        });
  });
  after(() => {
    Users.deleteViaApi(user.userId);
  });
  
  it('C350728 Cancelling approved invoices voids payments/credits and Unreleases encumbrances (thunderjet)', { tags: [testType.criticalPath, devTeams.thunderjet] }, () => {
    Invoices.searchByNumber(invoice.invoiceNumber);
    Helper.selectFromResultsList();
    Invoices.selectInvoiceLine();
  });
});
