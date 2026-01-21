import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../../support/fragments/invoices/invoices';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../../support/fragments/organizations/organizations';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import { TransactionDetails } from '../../../../support/fragments/finance';

describe('Fiscal Year Rollover', () => {
  const testData = {
    fiscalYears: {
      first: {},
      second: {},
    },
    ledger: {},
    fund: {},
    budgets: {
      current: {},
      planned: {},
    },
    organization: {},
    order: {},
    orderLine: {},
    invoice: {},
    user: {},
    location: {},
  };

  const createFiscalYears = () => {
    const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };

    return FiscalYears.createViaApi(firstFiscalYear).then((firstFYResponse) => {
      testData.fiscalYears.first = firstFYResponse;

      const secondFiscalYear = {
        ...FiscalYears.defaultUiFiscalYear,
        code: firstFYResponse.code.slice(0, -1) + '2',
        periodStart: `${DateTools.getDayTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
        periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
      };

      return FiscalYears.createViaApi(secondFiscalYear).then((secondFYResponse) => {
        testData.fiscalYears.second = secondFYResponse;
      });
    });
  };

  const createLedger = () => {
    const ledger = {
      ...Ledgers.defaultUiLedger,
      fiscalYearOneId: testData.fiscalYears.first.id,
    };

    return Ledgers.createViaApi(ledger).then((ledgerResponse) => {
      testData.ledger = ledgerResponse;
    });
  };

  const createFundWithBudget = () => {
    const fund = {
      ...Funds.defaultUiFund,
      ledgerId: testData.ledger.id,
    };

    return Funds.createViaApi(fund).then((fundResponse) => {
      testData.fund = fundResponse.fund;

      const currentBudget = {
        ...Budgets.getDefaultBudget(),
        fiscalYearId: testData.fiscalYears.first.id,
        fundId: fundResponse.fund.id,
        allocated: 1000,
        budgetStatus: 'Active',
      };

      return Budgets.createViaApi(currentBudget).then((budgetResponse) => {
        testData.budgets.current = budgetResponse;

        const plannedBudget = {
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.second.id,
          fundId: fundResponse.fund.id,
          allocated: 500,
          budgetStatus: 'Planned',
        };

        return Budgets.createViaApi(plannedBudget).then((plannedBudgetResponse) => {
          testData.budgets.planned = plannedBudgetResponse;
        });
      });
    });
  };

  const createOrderWithInvoice = (locationId, materialTypeId, acquisitionMethodId) => {
    const order = {
      id: uuid(),
      vendor: testData.organization.id,
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
      approved: true,
      reEncumber: true,
    };

    return Orders.createOrderViaApi(order).then((orderResponse) => {
      testData.order = orderResponse;

      const orderLine = {
        ...BasicOrderLine.defaultOrderLine,
        purchaseOrderId: orderResponse.id,
        cost: {
          listUnitPrice: 100.0,
          currency: 'USD',
          discountType: 'percentage',
          quantityPhysical: 1,
          poLineEstimatedPrice: 100.0,
        },
        fundDistribution: [
          {
            code: testData.fund.code,
            fundId: testData.fund.id,
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

      return OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
        testData.orderLine = orderLineResponse;

        return Orders.updateOrderViaApi({
          ...orderResponse,
          workflowStatus: ORDER_STATUSES.OPEN,
        }).then(() => {
          return OrderLines.getOrderLineViaApi({ query: `id=="${orderLineResponse.id}"` }).then(
            (orderLinesArray) => {
              testData.orderLine = orderLinesArray[0];

              return cy.getBatchGroups().then((batchGroup) => {
                return Invoices.createInvoiceWithInvoiceLineViaApi({
                  vendorId: testData.organization.id,
                  poLineId: testData.orderLine.id,
                  fiscalYearId: testData.fiscalYears.first.id,
                  batchGroupId: batchGroup.id,
                  fundDistributions: testData.orderLine.fundDistribution,
                  accountingCode: testData.organization.erpCode,
                  subTotal: 110.0,
                  releaseEncumbrance: true,
                  exportToAccounting: false,
                }).then((invoiceResponse) => {
                  testData.invoice = invoiceResponse;

                  return Invoices.changeInvoiceStatusViaApi({
                    invoice: invoiceResponse,
                    status: INVOICE_STATUSES.PAID,
                  });
                });
              });
            },
          );
        });
      });
    });
  };

  before(() => {
    cy.getAdminToken();

    createFiscalYears()
      .then(() => createLedger())
      .then(() => createFundWithBudget())
      .then(() => {
        return Organizations.createOrganizationViaApi({
          ...NewOrganization.defaultUiOrganizations,
          isVendor: true,
          exportToAccounting: false,
        }).then((orgResponse) => {
          testData.organization = { id: orgResponse };

          return ServicePoints.getViaApi().then((servicePoint) => {
            return NewLocation.createViaApi(
              NewLocation.getDefaultLocation(servicePoint[0].id),
            ).then((locationResponse) => {
              testData.location = locationResponse;

              return cy.getDefaultMaterialType().then((materialType) => {
                return cy
                  .getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  })
                  .then((acquisitionMethods) => {
                    return createOrderWithInvoice(
                      locationResponse.id,
                      materialType.id,
                      acquisitionMethods.body.acquisitionMethods[0].id,
                    );
                  });
              });
            });
          });
        });
      });

    cy.createTempUser([
      permissions.uiFinanceExecuteFiscalYearRollover.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
      permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitForLedgerDetailsLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C359186 "Planned" budget status is updating to "Active" during FY rollover (based on "Expended") (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C359186'] },
    () => {
      FinanceHelp.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.rollover();
      Ledgers.fillInRolloverInfoForOngoingOrdersWithAllocations(
        testData.fiscalYears.second.code,
        'None',
        'Transfer',
        'Expended',
      );
      Ledgers.closeRolloverInfo();
      Ledgers.selectFundInLedger(testData.fund.name);
      Funds.selectBudgetDetails();
      Funds.checkBudgetStatus('Closed');
      Funds.closeBudgetDetails();
      Funds.selectPlannedBudgetDetails();
      Funds.checkFundingInformation(
        '$500.00', // Initial allocation
        '$1,000.00', // Increase in allocation
        '$0.00', // Decrease in allocation
        '$1,500.00', // Total allocated (1000 + 500)
        '$0.00', // Net transfers
        '$1,500.00', // Total funding
      );
      Funds.checkFinancialActivityAndOverages(
        '$110.00', // Encumbered (paid amount from invoice)
        '$0.00', // Awaiting payment
        '$0.00', // Expended
        '$0.00', // Credited
        '$110.00', // Unavailable
      );
      Funds.checkBudgetStatus('Active');
      Funds.openTransactions();
      Funds.selectTransactionInList('Encumbrance');
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears.second.code },
          { key: 'Amount', value: '($110.00)' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: `${testData.fund.name} (${testData.fund.code})` },
          { key: 'Initial encumbrance', value: '$110.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
