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
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsInvoices from '../../support/fragments/invoices/settingsInvoices';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const defaultFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const allocatedQuantity = '100';
  defaultFiscalYear.code = defaultFiscalYear.code.slice(0, -1) + '1';
  let user;
  let servicePointId;
  let location;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });

        cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
        Funds.createViaApi(secondFund).then((secondFundResponse) => {
          secondFund.id = secondFundResponse.fund.id;
          FinanceHelp.searchByName(secondFund.name);
          Funds.selectFund(secondFund.name);
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
        Orders.createApprovedOrderForRollover(defaultOrder, true, false).then(
          (firstOrderResponse) => {
            defaultOrder.id = firstOrderResponse.id;
            orderNumber = firstOrderResponse.poNumber;
            Orders.checkCreatedOrder(defaultOrder);
            OrderLines.addPOLine();
            OrderLines.selectRandomInstanceInTitleLookUP('*', 0);
            OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
              defaultFund,
              '15',
              '1',
              '15',
              location.name,
            );
            Orders.backToPO();
            Orders.openOrder();
            cy.visit(TopMenu.invoicesPath);
            Invoices.createRolloverInvoice(invoice, organization.name);
            Invoices.createInvoiceLineFromPol(orderNumber);
          },
        );
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersView.gui,
      permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.settingsInvoiveApprovalPath,
        waiter: SettingsInvoices.waitApprovalsLoading,
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
    'C378895 An invoice with fund distribution different from related PO line can be approved (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C378895'] },
    () => {
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      Orders.selectInvoiceInRelatedInvoices(invoice.invoiceNumber);
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.changeFundInLine(secondFund);
      Invoices.approveInvoice();
      Invoices.selectInvoiceLine();
      Invoices.openPageFundInInvoiceLine(`${secondFund.name}(${secondFund.code})`);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Pending payment');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '($15.00)',
        invoice.invoiceNumber,
        'Payment',
        `${secondFund.name} (${secondFund.code})`,
      );
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$0.00',
        `${orderNumber}-1`,
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Released');
    },
  );
});
