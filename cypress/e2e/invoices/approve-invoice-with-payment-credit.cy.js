import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets, Funds, Transactions } from '../../support/fragments/finance';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import { Invoices, NewInvoice } from '../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    user: {},
  };
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
    approved: true,
    reEncumber: true,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const invoice = { ...NewInvoice.defaultUiInvoice };

  before(() => {
    cy.getAdminToken();
    const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();
    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
    testData.budget = budget;

    cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((locationResp) => {
      MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
        (mtypes) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((params) => {
            Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
              organization.id = responseOrganizations;
              order.vendor = organization.id;

              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 20.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 20.0,
                },
                fundDistribution: [
                  { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                ],
                locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: params.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtypes.body.id,
                  materialSupplier: responseOrganizations,
                  volumes: [],
                },
              };
              Orders.createOrderViaApi(order).then((orderResponse) => {
                order.id = orderResponse.id;
                testData.orderNumber = orderResponse.poNumber;
                orderLine.purchaseOrderId = orderResponse.id;

                OrderLines.createOrderLineViaApi(orderLine);
                Orders.updateOrderViaApi({
                  ...orderResponse,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
              });
            });
          });
        },
      );
    });

    cy.createTempUser([
      Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C347897 Approve invoice with both payment and credit (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C347897'] },
    () => {
      Invoices.createRolloverInvoice(invoice, organization.name);
      Invoices.createInvoiceLinePOLLookUWithSubTotal(testData.orderNumber, '10');
      Invoices.createInvoiceLinePOLLookUWithSubTotal(testData.orderNumber, '-10');
      Invoices.createInvoiceLinePOLLookUWithSubTotal(testData.orderNumber, '10');
      cy.wait(2000);
      Invoices.approveInvoice();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      FinanceHelp.searchByName(testData.fund.name);
      Funds.selectFund(testData.fund.name);
      Funds.selectBudgetDetails();
      Funds.checkFinancialActivityAndOverages('$10.00', '$10.00', '$0.00', '$0.00', '$20.00');
      Funds.viewTransactions();
      Funds.selectTransactionInList('Encumbrance');
      Funds.varifyDetailsInTransaction(
        testData.fiscalYear.code,
        '($10.00)',
        `${testData.orderNumber}-1`,
        'Encumbrance',
        `${testData.fund.name} (${testData.fund.code})`,
      );

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.searchByNumber(invoice.invoiceNumber);
      Invoices.selectInvoice(invoice.invoiceNumber);
      Invoices.payInvoice();

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      Transactions.closeTransactionsPage();
      Funds.checkFinancialActivityAndOverages('$10.00', '$0.00', '$20.00', '$10.00', '$20.00');
      Funds.viewTransactions();
      Funds.selectTransactionInList('Credit');
      Funds.varifyDetailsInTransactionFundTo(
        testData.fiscalYear.code,
        '$10.00',
        invoice.invoiceNumber,
        'Credit',
        `${testData.fund.name} (${testData.fund.code})`,
      );
    },
  );
});
