import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import LedgerRollovers from '../../support/fragments/finance/ledgers/ledgerRollovers';
import NewOrder from '../../support/fragments/orders/newOrder';
import Orders from '../../support/fragments/orders/orders';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import Invoices from '../../support/fragments/invoices/invoices';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import { CodeTools, StringTools } from '../../support/utils';
import { TransactionDetails } from '../../support/fragments/finance';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  INVOICE_STATUSES,
} from '../../support/constants';

describe('Orders', () => {
  const code = CodeTools(4);
  const testData = {
    fiscalYears: {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        ...DateTools.getFullFiscalYearStartAndEnd(0),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        ...DateTools.getFullFiscalYearStartAndEnd(1),
      },
    },
    ledger: {},
    funds: {
      fundA: {},
      fundB: {},
    },
    budgets: {
      fundA: {},
      fundB: {},
    },
    organization: {},
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
    location: {},
  };

  const createFundWithBudget = (ledgerId, fiscalYearId) => {
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId,
    };

    return Funds.createViaApi(fund).then((fundResponse) => {
      const budget = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId,
        fundId: fundResponse.fund.id,
        allocated: 1000,
      };

      return Budgets.createViaApi(budget).then((budgetResponse) => {
        return { fund: fundResponse.fund, budget: budgetResponse };
      });
    });
  };

  const createFinanceData = () => {
    return FiscalYears.createViaApi(testData.fiscalYears.first).then(() => {
      return FiscalYears.createViaApi(testData.fiscalYears.second).then(() => {
        const ledger = {
          ...Ledgers.defaultUiLedger,
          fiscalYearOneId: testData.fiscalYears.first.id,
        };

        return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          testData.ledger = ledgerResponse;

          return createFundWithBudget(ledgerResponse.id, testData.fiscalYears.first.id).then(
            (fundAData) => {
              testData.funds.fundA = fundAData.fund;
              testData.budgets.fundA = fundAData.budget;

              return createFundWithBudget(ledgerResponse.id, testData.fiscalYears.first.id).then(
                (fundBData) => {
                  testData.funds.fundB = fundBData.fund;
                  testData.budgets.fundB = fundBData.budget;
                },
              );
            },
          );
        });
      });
    });
  };

  const createOrderLine = (purchaseOrderId, locationId, materialTypeId, acquisitionMethodId) => {
    return {
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId,
      cost: {
        listUnitPrice: 100.0,
        currency: 'USD',
        discountType: 'percentage',
        quantityPhysical: 1,
        poLineEstimatedPrice: 100.0,
      },
      fundDistribution: [
        {
          code: testData.funds.fundA.code,
          fundId: testData.funds.fundA.id,
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
        volumes: [],
      },
    };
  };

  const createOrderWithLine = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      orderType: 'Ongoing',
      ongoing: {
        isSubscription: false,
        manualRenewal: false,
      },
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = createOrderLine(
        orderResponse.id,
        locationId,
        materialTypeId,
        acquisitionMethodId,
      );

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.orderLine = orderLinesArray[0];
            },
          );
        });
      });
    });
  };

  const createInvoiceForOrder = () => {
    return cy.getBatchGroups().then((batchGroup) => {
      return Invoices.createInvoiceWithInvoiceLineViaApi({
        vendorId: testData.organization.id,
        poLineId: testData.orderLine.id,
        fiscalYearId: testData.fiscalYears.first.id,
        batchGroupId: batchGroup.id,
        fundDistributions: testData.orderLine.fundDistribution,
        accountingCode: testData.organization.erpCode,
        subTotal: 100.0,
        releaseEncumbrance: true,
        exportToAccounting: false,
      }).then((invoiceResponse) => {
        testData.invoice.id = invoiceResponse.id;
        return Invoices.changeInvoiceStatusViaApi({
          invoice: invoiceResponse,
          status: INVOICE_STATUSES.PAID,
        });
      });
    });
  };

  const performRollover = () => {
    const rollover = LedgerRollovers.generateLedgerRollover({
      ledger: testData.ledger,
      fromFiscalYear: testData.fiscalYears.first,
      toFiscalYear: testData.fiscalYears.second,
      budgetsRollover: [
        {
          rolloverAllocation: true,
          rolloverBudgetValue: 'None',
          addAvailableTo: 'Available',
        },
      ],
      encumbrancesRollover: [],
    });

    return LedgerRollovers.createLedgerRolloverViaApi(rollover);
  };

  const performRolloverAndUpdateFiscalYears = () => {
    return performRollover()
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.first,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(-1),
        });
      })
      .then(() => {
        return FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears.second,
          _version: 1,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        });
      });
  };

  const createOrderData = () => {
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
            testData.location = locationResponse;

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
                  )
                    .then(() => createInvoiceForOrder())
                    .then(() => performRolloverAndUpdateFiscalYears());
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
      return createOrderData().then(() => {
        cy.createTempUser([
          permissions.uiFinanceViewFundAndBudget.gui,
          permissions.uiOrdersEdit.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
    });
  });

  it(
    'C594391 Encumbrance created as released when editing fund distribution of Order with released encumbrance after rollover (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C594391'] },
    () => {
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundA.name,
          expenseClass: '-',
          value: '100%',
          amount: '$0.00',
          initialEncumbrance: '$0.00',
          currentEncumbrance: '$0.00',
        },
      ]);
      OrderLineDetails.openOrderLineEditForm();
      OrderLines.changeFundInPOLWithoutSaveInPercents(0, testData.funds.fundB, '100');
      OrderLines.saveOrderLine();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds.fundB.name,
          expenseClass: '-',
          value: '100%',
          amount: '$0.00',
          initialEncumbrance: '$0.00',
          currentEncumbrance: '$0.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.funds.fundB.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.second.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: testData.orderLine.poLineNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.funds.fundB.name} (${testData.funds.fundB.code})` },
          { key: 'Initial encumbrance', value: '$0.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
