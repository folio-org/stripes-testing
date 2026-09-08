import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_VIEW_FIELD_LABELS,
} from '../../support/constants';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
} from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { CodeTools, DateTools, StringTools } from '../../support/utils';
import { Invoices } from '../../support/fragments/invoices';
import getRandomPostfix from '../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  describe('Order lines', () => {
    const code = CodeTools(4);

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_A${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_B${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
        third: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `autotest_year_C${getRandomPostfix()}`,
          code: `${code}${StringTools.randomTwoDigitNumber()}03`,
          ...DateTools.getFullFiscalYearStartAndEnd(2),
        },
      },
      ledgerA: {},
      fundA: {},
      budgetA: {},
      acquisitionMethodId: null,
      order1: {},
      orderLine1: {},
      orderLine2: {},
      invoice1: {},
      invoice2: {},
      user: {},
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first')
        .then(() => createFiscalYear('second'))
        .then(() => createFiscalYear('third'));
    };

    const createLedgerA = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        name: `autotest_ledgerA_${getRandomPostfix()}`,
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledger) => {
        testData.ledgerA = ledger;
      });
    };

    const createFundAWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `autotest_fundA_${getRandomPostfix()}`,
        code: `autotest_fundA_${getRandomPostfix()}`,
        ledgerId: testData.ledgerA.id,
      }).then((fundResponse) => {
        testData.fundA = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: testData.fundA.id,
          allocated: 1000,
        }).then((budget) => {
          testData.budgetA = budget;
        });
      });
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      if (testData.acquisitionMethodId) return cy.wrap(testData.acquisitionMethodId);

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
          return testData.acquisitionMethodId;
        });
    };

    const createOrderLine = ({ listUnitPrice }) => {
      return getAcquisitionMethodId().then((acquisitionMethodId) => {
        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            acquisitionMethod: acquisitionMethodId,
            purchaseOrderId: testData.order1.id,
            listUnitPrice,
            poLineEstimatedPrice: listUnitPrice,
            fundDistribution: [
              {
                code: testData.fundA.code,
                fundId: testData.fundA.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          }),
        );
      });
    };

    const createOrder1WithTwoLines = () => {
      return Orders.createOrderViaApi({
        ...NewOrder.getDefaultOngoingOrder({
          vendorId: testData.organization.id,
          ongoing: { isSubscription: false, manualRenewal: false },
        }),
      })
        .then((order) => {
          testData.order1 = order;
          return createOrderLine({ listUnitPrice: 10 });
        })
        .then((orderLine) => {
          testData.orderLine1 = orderLine;
          return createOrderLine({ listUnitPrice: 20 });
        })
        .then((orderLine) => {
          testData.orderLine2 = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order1,
            workflowStatus: ORDER_STATUSES.OPEN,
          });
        });
    };

    const createAndPayInvoice1 = () => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine1.id)
        .then((orderLine1) => {
          testData.orderLine1 = orderLine1;
          return OrderLines.getOrderLineByIdViaApi(testData.orderLine2.id);
        })
        .then((orderLine2) => {
          testData.orderLine2 = orderLine2;

          return Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            fiscalYearId: testData.fiscalYears.first.id,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            exportToAccounting: true,
          });
        })
        .then((invoice) => {
          testData.invoice1 = invoice;

          return Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              poLineId: testData.orderLine1.id,
              fundDistributions: testData.orderLine1.fundDistribution,
              subTotal: 5,
              releaseEncumbrance: true,
            }),
          );
        })
        .then(() => {
          return Invoices.createInvoiceLineViaApi(
            Invoices.getDefaultInvoiceLine({
              invoiceId: testData.invoice1.id,
              invoiceLineStatus: testData.invoice1.status,
              poLineId: testData.orderLine2.id,
              fundDistributions: testData.orderLine2.fundDistribution,
              subTotal: 15,
              releaseEncumbrance: false,
            }),
          );
        })
        .then(() => {
          return Invoices.changeInvoiceStatusViaApi({
            invoice: testData.invoice1,
            status: INVOICE_STATUSES.PAID,
          });
        });
    };

    const rolloverLedgerA = ({ fromFiscalYear, toFiscalYear, needCloseBudgets }) => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledgerA,
          fromFiscalYear,
          toFiscalYear,
          needCloseBudgets,
          encumbrancesRollover: [],
        }),
      );
    };

    const rolloverLedgerAToSecondFiscalYear = () => {
      return rolloverLedgerA({
        fromFiscalYear: testData.fiscalYears.first,
        toFiscalYear: testData.fiscalYears.second,
        needCloseBudgets: true,
      });
    };

    const rolloverLedgerAToThirdFiscalYear = () => {
      return rolloverLedgerA({
        fromFiscalYear: testData.fiscalYears.second,
        toFiscalYear: testData.fiscalYears.third,
        needCloseBudgets: false,
      });
    };

    const updateFiscalYearDates = (fiscalYearKey, offset) => {
      const updatedFY = {
        ...testData.fiscalYears[fiscalYearKey],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      };

      return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
        testData.fiscalYears[fiscalYearKey] = { ...updatedFY, _version: updatedFY._version + 1 };
      });
    };

    const shiftFiscalYearDatesAfterFirstRollover = () => {
      return updateFiscalYearDates('first', -1)
        .then(() => updateFiscalYearDates('second', 0))
        .then(() => updateFiscalYearDates('third', 1));
    };

    const shiftFiscalYearDatesAfterSecondRollover = () => {
      return updateFiscalYearDates('first', -2)
        .then(() => updateFiscalYearDates('second', -1))
        .then(() => updateFiscalYearDates('third', 0));
    };

    const updatePOL1UnitPrice = () => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine1.id).then((orderLine1) => {
        const updatedOrderLine = {
          ...orderLine1,
          cost: { ...orderLine1.cost, listUnitPrice: 11, fyroAdjustmentAmount: 0 },
        };

        return OrderLines.updateOrderLineViaApi(updatedOrderLine).then(() => {
          testData.orderLine1 = updatedOrderLine;
        });
      });
    };

    const createAndPayInvoice2 = () => {
      return OrderLines.getOrderLineByIdViaApi(testData.orderLine1.id)
        .then((orderLine1) => {
          testData.orderLine1 = orderLine1;

          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            fiscalYearId: testData.fiscalYears.third.id,
            poLineId: orderLine1.id,
            fundDistributions: orderLine1.fundDistribution,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            subTotal: 11,
            releaseEncumbrance: true,
            exportToAccounting: true,
          });
        })
        .then((invoice) => {
          testData.invoice2 = invoice;

          return Invoices.changeInvoiceStatusViaApi({
            invoice,
            status: INVOICE_STATUSES.PAID,
          });
        });
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiOrdersReopenPurchaseOrders.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
          Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order1.poNumber);
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      OrderLinesLimit.setPOLLimitViaApi(3);
      createConsecutiveFiscalYears()
        .then(createLedgerA)
        .then(createFundAWithBudget)
        .then(createOrganization)
        .then(createOrder1WithTwoLines)
        .then(createAndPayInvoice1)
        .then(rolloverLedgerAToSecondFiscalYear)
        .then(shiftFiscalYearDatesAfterFirstRollover)
        .then(rolloverLedgerAToThirdFiscalYear)
        .then(shiftFiscalYearDatesAfterSecondRollover)
        .then(updatePOL1UnitPrice)
        .then(createAndPayInvoice2)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C784407 PO summary displays correct values for the selected fiscal year when re-encumber is disabled and an order was re-opened (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C784407'] },
      () => {
        // Step 1: Check PO summary for the current FY
        Orders.selectFromResultsList(testData.order1.poNumber);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 2: Check options in the FY dropdown
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code, testData.fiscalYears.first.code],
        });

        // Step 3: Check PO summary for the previous FY
        OrderDetails.selectFiscalYear(testData.fiscalYears.second.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 4: Check PO summary for the year before last
        OrderDetails.selectFiscalYear(testData.fiscalYears.first.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$5.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$20.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 5: Close order with a reason
        Orders.closeOrder(ORDER_SYSTEM_CLOSING_REASONS.ERROR);
        OrderDetails.waitLoading();
        OrderDetails.selectFiscalYear(testData.fiscalYears.third.code);
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 6: Check options in the FY dropdown
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code, testData.fiscalYears.first.code],
        });

        // Step 7: Reopen the order
        OrderDetails.reOpenOrder({ orderNumber: testData.order1.poNumber });
        OrderDetails.selectFiscalYear(testData.fiscalYears.third.code);
        OrderDetails.waitLoading();
        OrderDetails.checkOrderDetails({
          summary: [
            { key: ORDER_VIEW_FIELD_LABELS.FISCAL_YEAR, value: testData.fiscalYears.third.code },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$11.00' },
            { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
          ],
        });

        // Step 8: Check options in the FY dropdown
        OrderDetails.checkFiscalYearDropdownOptions({
          current: [testData.fiscalYears.third.code],
          previous: [testData.fiscalYears.second.code, testData.fiscalYears.first.code],
        });
      },
    );
  });
});
