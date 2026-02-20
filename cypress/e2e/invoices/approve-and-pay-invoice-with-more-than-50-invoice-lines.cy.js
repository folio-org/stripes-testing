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
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { Approvals } from '../../support/fragments/settings/invoices';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import SettingsMenu from '../../support/fragments/settingsMenu';
import { ORDER_STATUSES, ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../support/constants';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import { BasicOrderLine } from '../../support/fragments/orders';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';

describe('Invoices', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultOrder = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 6000,
  };
  const invoice = {
    ...NewInvoice.defaultUiInvoice,
    invoiceNumber: FinanceHelp.getRandomInvoiceNumber(),
  };
  const isApprovePayEnabled = true;
  let user;
  let servicePointId;
  let location;
  const poLines = [];
  let materialType;
  let acquisitionMethod;
  let orderNumber;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);
        });
      });
    });

    cy.getAdminToken();
    ServicePoints.getViaApi().then((servicePoint) => {
      servicePointId = servicePoint[0].id;
      NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
        location = res;
      });
    });

    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
      cy.getBatchGroups().then((batchGroup) => {
        invoice.batchGroup = batchGroup.name;
        cy.loginAsAdmin({
          path: SettingsMenu.ordersPurchaseOrderLinesLimit,
          waiter: SettingsOrders.waitLoadingPurchaseOrderLinesLimit,
        });
        OrderLinesLimit.setPOLLimitViaApi(51);
      });
    });

    MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
      (mtypes) => {
        materialType = mtypes.body;
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }).then((params) => {
          acquisitionMethod = params.body.acquisitionMethods[0];

          defaultOrder.vendor = organization.id;

          Orders.createOrderViaApi(defaultOrder).then((orderResponse) => {
            defaultOrder.id = orderResponse.id;
            orderNumber = orderResponse.poNumber;

            for (let i = 0; i < 51; i++) {
              const poLine = BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod: acquisitionMethod.id,
                automaticExport: true,
                purchaseOrderId: orderResponse.id,
                vendorDetail: { vendorAccount: null },
                fundDistribution: [{ code: defaultFund.code, fundId: defaultFund.id, value: 100 }],
                cost: {
                  listUnitPrice: 100,
                  quantityPhysical: 1,
                  listUnitPriceElectronic: 100,
                  quantityElectronic: 1,
                  poLineEstimatedPrice: 100,
                  currency: 'USD',
                },
                locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: materialType.id,
                  materialSupplier: organization.id,
                  volumes: [],
                },
              });
              poLines.push(poLine);
            }

            cy.wrap(poLines).each((poLine) => {
              OrderLines.createOrderLineViaApi(poLine);
            });

            Orders.updateOrderViaApi({
              ...orderResponse,
              workflowStatus: ORDER_STATUSES.OPEN,
            }).then(() => {
              cy.loginAsAdmin({ path: TopMenu.ordersPath, waiter: Orders.waitLoading });
              Orders.searchByParameter('PO number', orderNumber);
              Orders.selectFromResultsList(orderNumber);
              Orders.newInvoiceFromOrder();
              Invoices.createInvoiceFromOrderWithMultiLines(invoice, defaultFiscalYear.code);
              cy.wait(100000); // Wait for invoice creation to complete
            });
          });
        });
      },
    );

    cy.createTempUser([
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.getAdminToken();
      Approvals.setApprovePayValueViaApi(isApprovePayEnabled);

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    OrderLinesLimit.setPOLLimitViaApi(1);
  });

  it(
    'C446075 Approve & pay invoice with more than 50 invoice lines (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C446075'] },
    () => {
      // Click on Invoice number link
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);

      // Verify invoice is in Open status
      InvoiceView.verifyStatus('Open');

      // Click "Actions" button and select "Approve & pay" option
      Invoices.approveAndPayInvoice();
      InvoiceView.verifyStatus('Paid');

      // Click on any invoice line
      Invoices.selectInvoiceLine();
      Invoices.verifyStatus('Paid');

      // Navigate to Finance app to check encumbrance details
      cy.visit(TopMenu.fundPath);
      Funds.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.selectBudgetDetails();
      Funds.openTransactions();

      Funds.chooseTransactionType('Encumbrance');
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$0.00',
        'PO line number',
        'Encumbrance',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionDetails();
      Funds.verifyTransactionWithAmountExist('Encumbrance', '$0.00');
      Funds.resetTransactionFilters();

      Funds.chooseTransactionType('Payment');
      Funds.selectTransactionInList('Payment');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '($1.00)',
        invoice.invoiceNumber,
        'Payment',
        `${defaultFund.name} (${defaultFund.code})`,
      );
      Funds.closeTransactionDetails();
      Funds.verifyTransactionWithAmountExist('Payment', '($1.00)');
    },
  );
});
