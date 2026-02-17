import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import { TransactionDetails, Transactions } from '../../support/fragments/finance';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Invoices from '../../support/fragments/invoices/invoices';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import InvoiceLineDetails from '../../support/fragments/invoices/invoiceLineDetails';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('Invoices', () => {
  const POL_COUNT = 91;
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    order: {},
    invoice: {},
    user: {},
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      cost: {
        listUnitPrice: 10.0,
        currency: 'USD',
        quantityPhysical: 1,
        poLineEstimatedPrice: 10.0,
      },
      fundDistribution: [
        {
          code: testData.fund.code,
          fundId: testData.fund.id,
          distributionType: 'percentage',
          value: 100,
        },
      ],
      locations: [
        {
          locationId,
          quantity: 1,
          quantityPhysical: 1,
        },
      ],
      acquisitionMethod: acquisitionMethodId,
      physical: {
        createInventory: 'Instance, Holding, Item',
        materialType: materialTypeId,
        materialSupplier: testData.organization.id,
      },
    };
  };

  const createOrderWithMultipleLines = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLinePromises = Array.from({ length: POL_COUNT }, () => {
        const orderLine = createOrderLine(
          orderResponse.id,
          locationId,
          materialTypeId,
          acquisitionMethodId,
        );
        return OrderLines.createOrderLineViaApi(orderLine);
      });

      return Promise.all(orderLinePromises).then(() => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      });
    });
  };

  const createInvoiceWithAllLines = () => {
    return OrderLines.getOrderLineViaApi({ query: `purchaseOrderId=="${testData.order.id}"` }).then(
      (orderLines) => {
        return cy.getBatchGroups().then((batchGroup) => {
          return Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            fiscalYearId: testData.fiscalYear.id,
            batchGroupId: batchGroup.id,
            accountingCode: testData.organization.erpCode,
          }).then((invoiceResponse) => {
            testData.invoice = invoiceResponse;

            const invoiceLinePromises = orderLines.map((orderLine) => {
              const invoiceLine = Invoices.getDefaultInvoiceLine({
                invoiceId: invoiceResponse.id,
                invoiceLineStatus: 'Open',
                poLineId: orderLine.id,
                fundDistributions: orderLine.fundDistribution,
                subTotal: 10.0,
                accountingCode: testData.organization.erpCode,
                releaseEncumbrance: true,
              });
              return Invoices.createInvoiceLineViaApi(invoiceLine);
            });

            return Promise.all(invoiceLinePromises).then(() => {
              return Invoices.changeInvoiceStatusViaApi({
                invoice: invoiceResponse,
                status: INVOICE_STATUSES.APPROVED,
              });
            });
          });
        });
      },
    );
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(FiscalYears.defaultUiFiscalYear).then((fiscalYearResponse) => {
      testData.fiscalYear = fiscalYearResponse;

      const ledger = {
        ...Ledgers.defaultUiLedger,
        fiscalYearOneId: fiscalYearResponse.id,
      };

      return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        testData.ledger = ledgerResponse;

        const fund = {
          ...Funds.getDefaultFund(),
          ledgerId: ledgerResponse.id,
        };

        return Funds.createViaApi(fund).then((fundResponse) => {
          testData.fund = fundResponse.fund;

          const budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYearResponse.id,
            fundId: fundResponse.fund.id,
            allocated: 10000,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createOrderData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
    }).then((organizationResponse) => {
      testData.organization = {
        id: organizationResponse,
        erpCode: NewOrganization.defaultUiOrganizations.erpCode,
      };

      return ServicePoints.getViaApi().then((servicePoint) => {
        return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
          (locationResponse) => {
            return cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
              return cy
                .getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
                })
                .then((acquisitionMethod) => {
                  return createOrderWithMultipleLines(
                    locationResponse.id,
                    materialType.id,
                    acquisitionMethod.body.acquisitionMethods[0].id,
                  ).then(() => {
                    return createInvoiceWithAllLines();
                  });
                });
            });
          },
        );
      });
    });
  };

  before('Create test data', () => {
    cy.getAdminToken();
    OrderLinesLimit.setPOLLimitViaApi(100);

    return createFinanceData().then(() => {
      return createOrderData().then(() => {
        cy.createTempUser([
          permissions.uiFinanceViewFundAndBudget.gui,
          permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
          permissions.uiInvoicesCancelInvoices.gui,
          permissions.uiOrdersView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.invoicesPath,
            waiter: Invoices.waitLoading,
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C375062 Cancel invoice with more than 90 invoice lines (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C375062'] },
    () => {
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
      InvoiceView.selectInvoiceLine(90);
      InvoiceLineDetails.checkInvoiceLineDetails({
        invoiceLineInformation: [
          { key: 'Status', value: INVOICE_STATUSES.CANCELLED },
          { key: 'Sub-total', value: '$10.00' },
        ],
      });
      InvoiceLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          amount: '$10.00',
          initialEncumbrance: '$10.00',
          currentEncumbrance: '$10.00',
        },
      ]);
      InvoiceLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '($10.00)' },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
      TransactionDetails.closeTransactionDetails();
      Funds.selectTransactionInListByIndex('Pending payment', 5);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$10.00' },
          { key: 'Source', value: testData.invoice.vendorInvoiceNo },
          { key: 'Type', value: 'Pending payment' },
          { key: 'From', value: testData.fund.name },
        ],
      });
      TransactionDetails.checkTransactionAmountInfo('Voided transaction');
      Transactions.clickNextPagination();
      Funds.selectTransactionInListByIndex('Encumbrance', 3);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '($10.00)' },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
