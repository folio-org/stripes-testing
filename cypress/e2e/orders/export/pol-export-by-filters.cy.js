import moment from 'moment';

import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';

describe('Orders', () => {
  describe('Export', () => {
    const firstFiscalYear = { ...FiscalYears.defaultRolloverFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const defaultOrder = {
      ...NewOrder.defaultOneTimeOrder,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const invoice = { ...NewInvoice.defaultUiInvoice };
    const allocatedQuantity = '100';
    const fileName = `order-export-${moment().format('YYYY-MM-DD')}-*.csv`;
    let user;
    let firstOrderNumber;
    let servicePointId;
    let location;

    before(() => {
      cy.getAdminToken();
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
      });
      defaultOrder.vendor = organization.name;
      cy.visit(TopMenu.ordersPath);
      Orders.createOrderForRollover(defaultOrder).then((firstOrderResponse) => {
        defaultOrder.id = firstOrderResponse.id;
        firstOrderNumber = firstOrderResponse.poNumber;
        Orders.checkCreatedOrder(defaultOrder);
        OrderLines.addPOLine();
        OrderLines.selectRandomInstanceInTitleLookUP('*', 5);
        OrderLines.rolloverPOLineInfoforPhysicalMaterialWithFund(
          defaultFund,
          '40',
          '1',
          '40',
          location.institutionId,
        );
        OrderLines.backToEditingOrder();
        Orders.openOrder();
        cy.visit(TopMenu.invoicesPath);
        Invoices.createRolloverInvoice(invoice, organization.name);
        Invoices.createInvoiceLineFromPol(firstOrderNumber);
        // Need to wait, while data will be loaded
        cy.wait(4000);
        Invoices.approveInvoice();
        Invoices.payInvoice();
      });

      cy.createTempUser([permissions.uiExportOrders.gui, permissions.uiOrdersView.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.orderLinesPath,
            waiter: OrderLines.waitLoading,
          });
        },
      );
    });

    after(() => {
      cy.getAdminToken();
      FileManager.deleteFilesFromDownloadsByMask(fileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C196751 Export orders based on orders lines search (thunderjet)',
      { tags: ['criticalPath', 'thunderjet'] },
      () => {
        OrderLines.selectFilterVendorPOL(invoice);
        Orders.exportResultsToCsv();
        OrderLines.checkDownloadedFile();
        OrderLines.resetFilters();
        cy.reload();
        OrderLines.selectFilterOngoingPaymentStatus();
        Orders.exportResultsToCsv();
        OrderLines.checkDownloadedFile();
      },
    );
  });
});
