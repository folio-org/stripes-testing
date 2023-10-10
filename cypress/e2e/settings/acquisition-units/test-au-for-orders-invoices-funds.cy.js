import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import NewOrder from '../../../support/fragments/orders/newOrder';
import Orders from '../../../support/fragments/orders/orders';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import Invoices from '../../../support/fragments/invoices/invoices';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('ui-acquisition units: Acquisition Units', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = {
    ...NewOrganization.defaultUiOrganizations,
    accounts: [
      {
        accountNo: getRandomPostfix(),
        accountStatus: 'Active',
        acqUnitIds: [],
        appSystemNo: '',
        description: 'Main library account',
        libraryCode: 'COB',
        libraryEdiCode: getRandomPostfix(),
        name: 'TestAccout1',
        notes: '',
        paymentMethod: 'Cash',
      },
    ],
  };
  const invoice = { ...NewInvoice.defaultUiInvoice };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  const allocatedQuantity = '100';
  let effectiveLocationServicePoint;
  let user;
  let orderNumber;
  let location;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;

          cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    ServicePoints.getViaApi({ limit: 1, query: 'name=="Circ Desk 2"' }).then((servicePoints) => {
      effectiveLocationServicePoint = servicePoints[0];
      NewLocation.createViaApi(
        NewLocation.getDefaultLocation(effectiveLocationServicePoint.id),
      ).then((locationResponse) => {
        location = locationResponse;

        Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
          organization.id = responseOrganizations;
          invoice.accountingCode = organization.erpCode;
        });
        defaultOrder.vendor = organization.name;
        cy.visit(TopMenu.ordersPath);
        Orders.createOrderForRollover(defaultOrder).then((orderResponse) => {
          defaultOrder.id = orderResponse.id;
          orderNumber = orderResponse.poNumber;
          Orders.checkCreatedOrder(defaultOrder);
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
          OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
            'Purchase',
            location.institutionId,
            '4',
          );
          OrderLines.backToEditingOrder();
          cy.visit(TopMenu.invoicesPath);
          Invoices.createRolloverInvoice(invoice, organization.name);
          Invoices.createInvoiceLineFromPol(orderNumber);
        });
      });
    });
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersDelete.gui,
      permissions.uiExportOrders.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersAssignAcquisitionUnitsToNewOrder.gui,
      permissions.uiOrdersCancelOrderLines.gui,
      permissions.uiOrdersCancelPurchaseOrders.gui,
      permissions.uiOrdersManageAcquisitionUnits.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
      permissions.uiOrdersShowAllHiddenFields.gui,
      permissions.uiOrdersUnopenpurchaseorders.gui,
      permissions.uiOrdersUpdateEncumbrances.gui,
      permissions.viewEditDeleteInvoiceInvoiceLine.gui,
      permissions.viewEditCreateInvoiceInvoiceLine.gui,
      permissions.assignAcqUnitsToNewInvoice.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.invoiceSettingsAll.gui,
      permissions.uiInvoicesCancelInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesDownloadBatchFileFromInvoiceRecord.gui,
      permissions.uiInvoicesExportSearchResults.gui,
      permissions.uiInvoicesManageAcquisitionUnits.gui,
      permissions.uiInvoicesVoucherExport.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.invoicesPath, waiter: Invoices.waitLoading });
    Invoices.searchByNumber(invoice.invoiceNumber);
    Invoices.selectInvoice(invoice.invoiceNumber);
    Invoices.deleteInvoiceViaActions();
    Invoices.confirmInvoiceDeletion();
    Orders.deleteOrderViaApi(defaultOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);

    cy.visit(TopMenu.fundPath);
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaActions();
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);

    cy.visit(SettingsMenu.acquisitionUnitsPath);
    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C163931 Test acquisition unit restrictions for apply Funds to orders or Invoices (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignUser(user.username);
      cy.visit(TopMenu.fundPath);
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.addAUToFund(defaultAcquisitionUnit.name);

      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.addFundToPOL(defaultFund, '40');
      OrderLines.editPOLInOrder();
      OrderLines.deleteFundInPOL();
      OrderLines.backToEditingOrder();

      cy.visit(TopMenu.invoicesPath);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.addFundToLine(defaultFund);
      Invoices.selectInvoiceLine();
      Invoices.editInvoiceLine();
      Invoices.deleteFundInInvoiceLine();

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.unAssignUser(defaultAcquisitionUnit.name);

      cy.login(user.username, user.password, { path: TopMenu.fundPath, waiter: Funds.waitLoading });
      FinanceHelp.searchByName(defaultFund.name);
      Funds.checkZeroSearchResultsHeader();
    },
  );
});
