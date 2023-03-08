import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import getRandomPostfix from '../../support/utils/stringTools';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import OrderLines from '../../support/fragments/orders/orderLines';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../support/fragments/finance/funds/funds';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import SettingsMenu from '../../support/fragments/settingsMenu';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';
import NewInvoice from '../../support/fragments/invoices/newInvoice';
import NewInvoiceLine from '../../support/fragments/invoices/newInvoiceLine';
import Invoices from '../../support/fragments/invoices/invoices';
import VendorAddress from '../../support/fragments/invoices/vendorAddress';
import FinanceHelp from '../../support/fragments/finance/financeHelper';

describe('orders: Unopen order', () => {
  const order = { ...NewOrder.defaultOngoingTimeOrder,
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations,
    addresses:[{
      addressLine1: '1 Centerpiece Blvd.',
      addressLine2: 'P.O. Box 15550',
      city: 'New Castle',
      stateRegion: 'DE',
      zipCode: '19720-5550',
      country: 'USA',
      isPrimary: true,
      categories: [],
      language: 'English'
    }] };
  const item = {
    instanceName: `testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
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

  const allocatedQuantityForFistFund = '100';
  const allocatedQuantityForSecondFund = '100';
  let user;
  let orderNumber;
  let orderID;
  let location;
  let servicePointId;

  before(() => {
    cy.getAdminToken();

    Organizations.createOrganizationViaApi(organization)
      .then(response => {
        organization.id = response;
        order.vendor = organization.id;
      });
    invoice.accountingCode = organization.erpCode;
    invoice.vendorName = organization.name;
    Object.assign(vendorPrimaryAddress,
      organization.addresses.find(address => address.isPrimary === true));
    invoice.batchGroup = 'FOLIO';


    FiscalYears.createViaApi(defaultFiscalYear)
    .then(response => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

      Ledgers.createViaApi(defaultLedger)
        .then(ledgerResponse => {
          defaultLedger.id = ledgerResponse.id;
          firstFund.ledgerId = defaultLedger.id;
          secondFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(firstFund)
            .then(fundResponse => {
              firstFund.id = fundResponse.fund.id;

              cy.loginAsAdmin({ path:TopMenu.fundPath, waiter: Funds.waitLoading });
              FinanceHelp.searchByName(firstFund.name);
              Funds.selectFund(firstFund.name);
              Funds.addBudget(allocatedQuantityForFistFund);
            });

          Funds.createViaApi(secondFund)
            .then(secondFundResponse => {
              secondFund.id = secondFundResponse.fund.id;

              cy.visit(TopMenu.fundPath);
              FinanceHelp.searchByName(secondFund.name);
              Funds.selectFund(secondFund.name);
              Funds.addBudget(allocatedQuantityForSecondFund);
            });
        });
    });

    cy.createOrderApi(order)
      .then((response) => {
        orderNumber = response.body.poNumber;
        orderID = response.body.id;
        cy.visit(TopMenu.ordersPath);
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.fillInPOLineInfoWithFund(firstFund);
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        cy.visit(TopMenu.invoicesPath);
        Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
        Invoices.createInvoiceLinePOLLookUp(orderNumber);
        Invoices.approveInvoice();
        Invoices.payInvoice();
      });



    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiApproveOrder.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
      permissions.uiOrdersUnopenpurchaseorders.gui,
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password, { path:TopMenu.ordersPath, waiter: Orders.waitLoading });
      });
  });


  it('C375106 Unopen order with changed Fund distribution when related paid invoice exists (thunderjet)', { tags: [testType.smoke, devTeams.thunderjet] }, () => {
    Orders.searchByParameter('PO number', orderNumber);
    Orders.selectFromResultsList(orderNumber);
    Orders.unOpenOrder();
    OrderLines.selectPOLInOrder();
    OrderLines.backToEditingOrder();
    Orders.openOrder();
    OrderLines.selectPOLInOrder();
    
      cy.window().then((win) => {
        const newWindow =     OrderLines.selectCurrentEncumbrance('$0.00');
        cy.wrap(newWindow).should('have.property', 'closed', false);

        cy.wrap(newWindow).should('have.property', 'focused', true);
        Funds.waitLoadingTransactions();
        newWindow.close();
      
        cy.wrap(newWindow).should('have.property', 'closed', true);
      });
      
    cy.visit(TopMenu.invoicesPath);
    Invoices.searchByNumber(invoice.invoiceNumber);
    Invoices.selectInvoice(invoice.invoiceNumber);
    Invoices.selectInvoiceLine();
  });
});
