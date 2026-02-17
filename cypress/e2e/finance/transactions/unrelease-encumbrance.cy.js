import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import { TransactionDetails, Transactions } from '../../../support/fragments/finance';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import {
  InvoiceLineDetails,
  Invoices,
  InvoiceView,
  NewInvoice,
} from '../../../support/fragments/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../../support/utils';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance', () => {
  describe('Transactions', () => {
    const code = CodeTools(4);
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      fiscalYear: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        periodStart: DateTools.getCurrentDateForFiscalYear(),
        periodEnd: DateTools.getDayAfterTomorrowDateForFiscalYear(),
      },
      ledger: {},
      fund: {},
      budget: {},
      organization,
      user: {},
      order: {
        ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
        orderType: 'Ongoing',
        ongoing: { isSubscription: false, manualRenewal: false },
        approved: true,
        reEncumber: true,
      },
      invoice: { ...NewInvoice.defaultUiInvoice, vendorName: organization.name },
    };

    before(() => {
      cy.getAdminToken();
      const { ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: testData.fiscalYear,
        budget: { allocated: 100 },
      });
      testData.ledger = ledger;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(organization).then((orgResp) => {
        organization.id = orgResp;
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
          (locationResp) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((amResp) => {
              cy.getBookMaterialType().then((mtypeResp) => {
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
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      value: 100,
                    },
                  ],
                  locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypeResp.id,
                    materialSupplier: orgResp,
                    volumes: [],
                  },
                };

                Orders.createOrderViaApi(testData.order).then((orderResp) => {
                  testData.order.id = orderResp.id;
                  testData.orderNumber = orderResp.poNumber;
                  orderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                    testData.orderLine = orderLineResponse;

                    Orders.updateOrderViaApi({
                      ...orderResp,
                      workflowStatus: ORDER_STATUSES.OPEN,
                    });

                    Invoices.createInvoiceWithInvoiceLineViaApi({
                      vendorId: organization.id,
                      fiscalYearId: testData.fiscalYear.id,
                      poLineId: testData.orderLine.id,
                      fundDistributions: testData.orderLine.fundDistribution,
                      accountingCode: organization.erpCode,
                      releaseEncumbrance: true,
                      subTotal: 20,
                    }).then((invoiceRescponse) => {
                      testData.invoice = invoiceRescponse;

                      Invoices.changeInvoiceStatusViaApi({
                        invoice: testData.invoice,
                        status: INVOICE_STATUSES.APPROVED,
                      });
                    });
                  });
                });
              });
            });
          },
        );
      });

      cy.createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
        Permissions.uiInvoicesCancelInvoices.gui,
        Permissions.uiOrdersView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });

    it(
      'C375105 Unrelease encumbrance when cancelling approved invoice related to Ongoing order (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C375105'] },
      () => {
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
          voucherInformation: [{ key: 'Status', value: 'Awaiting payment' }],
        });
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          {
            name: testData.fund.name,
            amount: '$20.00',
            initialEncumbrance: '$20.00',
            currentEncumbrance: '$0.00',
          },
        ]);
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: testData.fiscalYear.code },
            { key: 'Amount', value: '$0.00' },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: '$20.00' },
            { key: 'Awaiting payment', value: '$20.00' },
            { key: 'Expended', value: '$0.00' },
            { key: 'Status', value: 'Released' },
          ],
        });

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
        Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
        Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.APPROVED }],
          voucherInformation: [{ key: 'Status', value: 'Awaiting payment' }],
        });
        Invoices.cancelInvoice();
        InteractorsTools.checkCalloutMessage('Invoice has been cancelled successfully');
        InvoiceView.checkInvoiceDetails({
          title: testData.invoice.vendorInvoiceNo,
          invoiceInformation: [{ key: 'Status', value: INVOICE_STATUSES.CANCELLED }],
          voucherInformation: [{ key: 'Status', value: 'Cancelled' }],
        });
        InvoiceView.selectInvoiceLine();
        InvoiceLineDetails.checkFundDistibutionTableContent([
          {
            amount: '$20.00',
            initialEncumbrance: '$20.00',
            currentEncumbrance: '$20.00',
          },
        ]);
        InvoiceLineDetails.openEncumbrancePane();
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: testData.fiscalYear.code },
            { key: 'Amount', value: '($20.00)' },
            { key: 'Source', value: `${testData.orderNumber}-1` },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: testData.fund.name },
            { key: 'Initial encumbrance', value: '$20.00' },
            { key: 'Awaiting payment', value: '$0.00' },
            { key: 'Expended', value: '$0.00' },
            { key: 'Status', value: 'Unreleased' },
          ],
        });
        ['Encumbrance', 'Pending payment'].forEach((transactionType) => {
          Transactions.checkTransactionsList({
            records: [{ type: transactionType }],
            present: true,
          });
        });
        Transactions.selectTransaction('Pending payment');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: testData.fiscalYear.code },
            { key: 'Amount', value: '20.00', isVoided: true },
            { key: 'Source', value: testData.invoice.vendorInvoiceNo },
            { key: 'Type', value: 'Pending payment' },
            { key: 'From', value: testData.fund.name },
          ],
        });
        TransactionDetails.checkTransactionAmountInfo('Voided transaction');
      },
    );
  });
});
