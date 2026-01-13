import { APPLICATION_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import { FiscalYears, Funds, Ledgers } from '../../../support/fragments/finance';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import { Invoices, NewInvoice } from '../../../support/fragments/invoices';
import { NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Acquisition Units', () => {
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
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading, authRefresh: true });
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          FinanceHelp.searchByName(defaultFund.name);
          Funds.selectFund(defaultFund.name);
          Funds.addBudget(allocatedQuantity);
        });
      });
    });
    ServicePoints.getCircDesk2ServicePointViaApi().then((servicePoint) => {
      effectiveLocationServicePoint = servicePoint;
      NewLocation.createViaApi(
        NewLocation.getDefaultLocation(effectiveLocationServicePoint.id),
      ).then((locationResponse) => {
        location = locationResponse;

        Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
          organization.id = responseOrganizations;
          invoice.accountingCode = organization.erpCode;
        });
        defaultOrder.vendor = organization.name;
        TopMenuNavigation.openAppFromDropdown('Orders');
        Orders.selectOrdersPane();
        Orders.createApprovedOrderForRollover(defaultOrder, true).then((orderResponse) => {
          defaultOrder.id = orderResponse.id;
          orderNumber = orderResponse.poNumber;
          Orders.checkCreatedOrder(defaultOrder);
          OrderLines.addPOLine();
          OrderLines.selectRandomInstanceInTitleLookUP('*', 10);
          OrderLines.fillInPOLineInfoForExportWithLocationForPhysicalResource(
            'Purchase',
            location.name,
            '4',
          );
          OrderLines.backToEditingOrder();
          TopMenuNavigation.openAppFromDropdown('Invoices');
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
    cy.loginAsAdmin({
      path: TopMenu.fundPath,
      waiter: Funds.waitLoading,
      authRefresh: true,
    });
    Invoices.getInvoiceViaApi({
      query: `vendorInvoiceNo="${invoice.invoiceNumber}"`,
    }).then(({ invoices }) => {
      invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id));
    });
    Orders.deleteOrderViaApi(defaultOrder.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(user.userId);
    AcquisitionUnits.getAcquisitionUnitViaApi({
      query: `"name"="${defaultAcquisitionUnit.name}"`,
    }).then((response) => {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(response.acquisitionsUnits[0].id);
    });
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaActions();
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
  });

  it(
    'C163931 Test acquisition unit restrictions for apply Funds to orders or Invoices (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C163931'] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignUser(user.username);
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.FINANCE);
      FinanceHelp.selectFundsNavigation();
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.addAUToFund(defaultAcquisitionUnit.name);

      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
        authRefresh: true,
      });
      Orders.searchByParameter('PO number', orderNumber);
      Orders.selectFromResultsList(orderNumber);
      OrderLines.selectPOLInOrder(0);
      OrderLines.editPOLInOrder();
      OrderLines.addFundToPOL(defaultFund, '40');
      OrderLines.editPOLInOrder();
      OrderLines.deleteFundInPOL();
      OrderLines.backToEditingOrder();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
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
        authRefresh: true,
      });
      AcquisitionUnits.unAssignUser(user.username, defaultAcquisitionUnit.name);

      cy.login(user.username, user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
      FinanceHelp.searchByName(defaultFund.name);
      Funds.checkZeroSearchResultsHeader();
    },
  );
});
