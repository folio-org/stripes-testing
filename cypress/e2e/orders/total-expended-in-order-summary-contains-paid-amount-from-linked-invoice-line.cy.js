import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Invoices from '../../support/fragments/invoices/invoices';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
} from '../../support/constants';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';

describe('Orders', () => {
  const testData = {
    fiscalYear: {},
    ledger: {},
    fund: {},
    budget: {},
    organization: {},
    orders: [],
    orderLines: [],
    invoice: {},
    user: {},
  };

  const createOrderLine = (
    purchaseOrderId,
    locationId,
    materialTypeId,
    acquisitionMethodId,
    amount,
  ) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      cost: {
        listUnitPrice: amount,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: amount,
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

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId, amount) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'One-Time',
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
        amount,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              return {
                order: orderResponse,
                orderLine: orderLinesArray[0],
              };
            },
          );
        });
      });
    });
  };

  const createInvoiceWithTwoLines = () => {
    return cy.getBatchGroups().then((batchGroup) => {
      return Invoices.createInvoiceViaApi({
        vendorId: testData.organization.id,
        fiscalYearId: testData.fiscalYear.id,
        batchGroupId: batchGroup.id,
        accountingCode: testData.organization.erpCode,
        exportToAccounting: false,
      }).then((invoiceResponse) => {
        testData.invoice = invoiceResponse;

        const invoiceLine1 = Invoices.getDefaultInvoiceLine({
          invoiceId: invoiceResponse.id,
          invoiceLineStatus: 'Open',
          poLineId: testData.orderLines[0].id,
          fundDistributions: testData.orderLines[0].fundDistribution,
          subTotal: 1.0,
          accountingCode: testData.organization.erpCode,
          releaseEncumbrance: true,
        });

        const invoiceLine2 = Invoices.getDefaultInvoiceLine({
          invoiceId: invoiceResponse.id,
          invoiceLineStatus: 'Open',
          poLineId: testData.orderLines[1].id,
          fundDistributions: testData.orderLines[1].fundDistribution,
          subTotal: 2.0,
          accountingCode: testData.organization.erpCode,
          releaseEncumbrance: true,
        });

        return Invoices.createInvoiceLineViaApi(invoiceLine1).then(() => {
          return Invoices.createInvoiceLineViaApi(invoiceLine2).then(() => {
            return Invoices.changeInvoiceStatusViaApi({
              invoice: invoiceResponse,
              status: INVOICE_STATUSES.APPROVED,
            }).then(() => {
              return Invoices.changeInvoiceStatusViaApi({
                invoice: invoiceResponse,
                status: INVOICE_STATUSES.PAID,
              }).then(() => {
                testData.invoice.status = INVOICE_STATUSES.PAID;
              });
            });
          });
        });
      });
    });
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
            allocated: 100,
          };

          return Budgets.createViaApi(budget).then((budgetResponse) => {
            testData.budget = budgetResponse;
          });
        });
      });
    });
  };

  const createOrdersData = () => {
    return Organizations.createOrganizationViaApi({
      ...NewOrganization.defaultUiOrganizations,
      isVendor: true,
      exportToAccounting: false,
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
                  return createOrderWithLine(
                    locationResponse.id,
                    materialType.id,
                    acquisitionMethod.body.acquisitionMethods[0].id,
                    1.0,
                  ).then((order1Data) => {
                    testData.orders.push(order1Data.order);
                    testData.orderLines.push(order1Data.orderLine);

                    return createOrderWithLine(
                      locationResponse.id,
                      materialType.id,
                      acquisitionMethod.body.acquisitionMethods[0].id,
                      2.0,
                    ).then((order2Data) => {
                      testData.orders.push(order2Data.order);
                      testData.orderLines.push(order2Data.orderLine);

                      return createInvoiceWithTwoLines();
                    });
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
    return createFinanceData().then(() => {
      return createOrdersData().then(() => {
        cy.createTempUser([permissions.uiOrdersView.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
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
    'C648465 Total expended value in order summary contains paid amount related only to linked invoice line (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C648465'] },
    () => {
      Orders.searchByParameter('PO number', testData.orders[0].poNumber);
      Orders.selectFromResultsList(testData.orders[0].poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails({
        summary: [{ key: 'Total expended', value: '$1.00' }],
      });
      OrderDetails.checkRelatedInvoicesTableContent([
        {
          vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
          fiscalYear: testData.fiscalYear.code,
          invoiceDate: new Date(testData.invoice.invoiceDate).toLocaleDateString('en-US'),
          vendorCode: testData.organization.code,
          vendorInvoiceNumber: testData.invoice.vendorInvoiceNo,
          status: testData.invoice.status,
          expendedAmount: testData.invoice.total,
        },
      ]);
      Orders.searchByParameter('PO number', testData.orders[1].poNumber);
      Orders.selectFromResultsList(testData.orders[1].poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);
      OrderDetails.checkOrderDetails([{ key: 'Total expended', value: '$2.00' }]);
      OrderDetails.checkRelatedInvoicesTableContent([
        {
          vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
          fiscalYear: testData.fiscalYear.code,
          invoiceDate: new Date(testData.invoice.invoiceDate).toLocaleDateString('en-US'),
          vendorCode: testData.organization.code,
          vendorInvoiceNumber: testData.invoice.vendorInvoiceNo,
          status: testData.invoice.status,
          expendedAmount: testData.invoice.total,
        },
      ]);
    },
  );
});
