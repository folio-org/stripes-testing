import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  ORDER_TYPES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import {
  Budgets,
  FiscalYears,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import {
  ROLLOVER_BUDGET_VALUE_AS,
  LEDGER_ROLLOVER_BUDGET_VALUE,
  LEDGER_ROLLOVER_ORDER_TYPES,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
} from '../../../../support/constants/finance/rollover';
import Funds from '../../../../support/fragments/finance/funds/funds';
import { InvoiceLineDetails, Invoices } from '../../../../support/fragments/invoices';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import NewOrder from '../../../../support/fragments/orders/newOrder';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import Orders from '../../../../support/fragments/orders/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { ORDER_INVOICE_ANALYSIS_FIELDS } from '../../../../support/constants/query-builder/orderInvoiceAnalysisFields';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import ExpenseClasses from '../../../../support/fragments/settings/finance/expenseClasses';
import OrderLinesLimit from '../../../../support/fragments/settings/orders/orderLinesLimit';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import { CodeTools, StringTools } from '../../../../support/utils';
import SelectOrganizationModal from '../../../../support/fragments/orders/modals/selectOrganizationModal';

const recordType = Lists.recordTypes.orderInvoiceAnalysis;
const currentYear = new Date().getFullYear();
const code = CodeTools(4);
const testData = {
  user: {},
  vendorA: NewOrganization.getDefaultOrganization({ isVendor: true }),
  vendorB: NewOrganization.getDefaultOrganization({ isVendor: true }),
  ledger: {},
  fundA: {},
  fundB: {},
  budgetA: {},
  budgetB: {},
  fiscalYear1: {
    ...FiscalYears.getDefaultFiscalYear(),
    ...DateTools.getFullFiscalYearStartAndEnd(0),
    code: `${code}${StringTools.randomTwoDigitNumber()}01`,
  },
  fiscalYear2: {
    ...FiscalYears.getDefaultFiscalYear(),
    ...DateTools.getFullFiscalYearStartAndEnd(1),
    code: `${code}${StringTools.randomTwoDigitNumber()}02`,
  },
  electronicExpenseClassId: null,
  printExpenseClassId: null,
  electronicExpenseClassName: '',
  printExpenseClassName: '',
  order1: {},
  pol1: {},
  order2: {},
  pol2Line1: {},
  pol2Line2: {},
  order3: {},
  order5: {},
  pol5: {},
  invLine5: {},
  order6: {},
  pol6: {},
  order7: {},
  pol7: {},
  invoice1: {},
  invLine1: {},
  invoice2: {},
  invLine2Line1: {},
  invLine2Line2: {},
  invoice3: {},
  invLine3: {},
  invoice4: {},
  invLine4Line1: {},
  invLine4Line2: {},
  invLine4Line3: {},
  invoice5: {},
  invoice6: {},
  invLine6: {},
  invoice7: {},
  invLine7: {},
  invoice8: {},
  listName1: getTestEntityValue('C736712_List1'),
  listName2: getTestEntityValue('C736712_List2'),
};

const columnsForMultiParamQuery = [
  ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE.PO_LINE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.VENDOR_INVOICE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.INVOICE_LINE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.FUND_DISTRIBUTION_AMOUNT,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.FUND_DISTRIBUTION_VALUE,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.SUB_TOTAL,
  ORDER_INVOICE_ANALYSIS_FIELDS.FUND.CODE,
  ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.NAME,
];

const columnsForSingleParamQuery = [
  ORDER_INVOICE_ANALYSIS_FIELDS.PO.ORDER_TYPE,
  ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
  ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE.PO_LINE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.VENDOR_INVOICE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.INVOICE_LINE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.SUB_TOTAL,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.FISCAL_YEAR,
  ORDER_INVOICE_ANALYSIS_FIELDS.FUND.CODE,
  ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.NAME,
];

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Invoice Order Analytics', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        OrderLinesLimit.setPOLLimitViaApi(2);
        cy.wait(2000);

        Organizations.createOrganizationViaApi(testData.vendorA).then((id) => {
          testData.vendorA.id = id;
        });
        Organizations.createOrganizationViaApi(testData.vendorB).then((id) => {
          testData.vendorB.id = id;
        });

        ExpenseClasses.getExpenseClassesViaApi({ query: 'name=="Electronic"', limit: 1 }).then(
          (classes) => {
            testData.electronicExpenseClassId = classes[0]?.id;
            testData.electronicExpenseClassName = classes[0]?.name;
          },
        );
        ExpenseClasses.getExpenseClassesViaApi({ query: 'name=="Print"', limit: 1 }).then(
          (classes) => {
            testData.printExpenseClassId = classes[0]?.id;
            testData.printExpenseClassName = classes[0]?.name;
          },
        );

        cy.getLocations({ limit: 1 }).then((location) => {
          testData.locationId = location.id;
        });
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }).then((amResp) => {
          testData.acquisitionMethodId = amResp.body.acquisitionMethods[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
          testData.materialTypeId = materialType.id;
        });

        FiscalYears.createViaApi(testData.fiscalYear1).then((fy1) => {
          testData.fiscalYear1 = fy1;

          const ledger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: fy1.id,
            restrictExpenditures: false,
            restrictEncumbrance: false,
          };
          Ledgers.createViaApi(ledger).then((createdLedger) => {
            testData.ledger = createdLedger;

            const fundA = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fundA).then((fundAResp) => {
              testData.fundA = fundAResp.fund;

              const budgetA = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy1.id,
                fundId: fundAResp.fund.id,
                allocated: 1000,
              };
              Budgets.createViaApi(budgetA).then((budgetAResp) => {
                testData.budgetA = budgetAResp;
                cy.then(() => {
                  Budgets.updateBudgetViaApi({
                    ...budgetAResp,
                    statusExpenseClasses: [
                      { status: 'Active', expenseClassId: testData.electronicExpenseClassId },
                      { status: 'Active', expenseClassId: testData.printExpenseClassId },
                    ],
                  });
                });
              });
            });

            const fundB = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fundB).then((fundBResp) => {
              testData.fundB = fundBResp.fund;

              const budgetB = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy1.id,
                fundId: fundBResp.fund.id,
                allocated: 100,
              };
              Budgets.createViaApi(budgetB).then((budgetBResp) => {
                testData.budgetB = budgetBResp;
              });
            });
          });
        });

        FiscalYears.createViaApi(testData.fiscalYear2).then((fy2) => {
          testData.fiscalYear2 = fy2;
        });

        cy.then(() => {
          const createOngoingOrderWithPol = (vendor, fund, { listUnitPrice = 10 } = {}) => {
            const order = {
              ...NewOrder.defaultOngoingTimeOrder,
              id: uuid(),
              vendor: vendor.id,
              reEncumber: true,
            };
            return Orders.createOrderViaApi(order).then((ord) => {
              const pol = BasicOrderLine.getDefaultOrderLine({
                purchaseOrderId: ord.id,
                fundDistribution: [
                  {
                    code: fund.code,
                    fundId: fund.id,
                    distributionType: 'percentage',
                    value: 100,
                    ...(testData.electronicExpenseClassId && fund.id === testData.fundA.id
                      ? { expenseClassId: testData.electronicExpenseClassId }
                      : {}),
                  },
                ],
                specialLocationId: testData.locationId,
                specialMaterialTypeId: testData.materialTypeId,
                acquisitionMethod: testData.acquisitionMethodId,
                listUnitPrice,
                poLineEstimatedPrice: listUnitPrice,
              });
              return OrderLines.createOrderLineViaApi(pol).then((polResp) => {
                return Orders.updateOrderViaApi({
                  ...ord,
                  workflowStatus: ORDER_STATUSES.OPEN,
                }).then(() => ({ order: ord, pol: polResp }));
              });
            });
          };
          // Order #1
          createOngoingOrderWithPol(testData.vendorA, testData.fundA, {
            listUnitPrice: 10,
          }).then(({ order: ord1, pol: pol1 }) => {
            testData.order1 = ord1;
            testData.pol1 = pol1;
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.vendorA.id,
              fiscalYearId: testData.fiscalYear1.id,
              accountingCode: testData.vendorA.erpCode,
              poLineId: pol1.id,
              fundDistributions: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  expenseClassId: testData.printExpenseClassId,
                },
              ],
              subTotal: 10,
            }).then((inv1) => {
              testData.invoice1 = inv1;
              // Get invoice line details
              InvoiceLineDetails.getInvoiceLinesViaApi({
                query: `invoiceId=="${inv1.id}"`,
              }).then(({ invoiceLines }) => {
                testData.invLine1 = invoiceLines[0];
              });
              Invoices.changeInvoiceStatusViaApi({
                invoice: inv1,
                status: INVOICE_STATUSES.PAID,
              });
            });
          });

          // Order #2: Ongoing order with 2 POLs, Vendor B, re-encumber enabled
          // POL 1: Fund A + Electronic expense class
          // POL 2: Fund A + Print expense class
          const order2 = {
            ...NewOrder.defaultOngoingTimeOrder,
            id: uuid(),
            vendor: testData.vendorB.id,
            reEncumber: true,
          };
          Orders.createOrderViaApi(order2).then((ord2) => {
            testData.order2 = ord2;

            // POL #2-1: Fund A + Electronic expense class
            const pol2Line1 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord2.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  expenseClassId: testData.electronicExpenseClassId,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
            });
            OrderLines.createOrderLineViaApi(pol2Line1).then((pol2Line1Resp) => {
              testData.pol2Line1 = pol2Line1Resp;
            });

            // POL #2-2: Fund A + Print expense class
            const pol2Line2 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord2.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  expenseClassId: testData.printExpenseClassId,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 15,
              poLineEstimatedPrice: 15,
            });
            OrderLines.createOrderLineViaApi(pol2Line2).then((pol2Line2Resp) => {
              testData.pol2Line2 = pol2Line2Resp;
            });

            // Open the order after creating both POLs
            Orders.updateOrderViaApi({ ...ord2, workflowStatus: ORDER_STATUSES.OPEN });

            // Create Invoice #2 for Order #2 with invoice lines for both POLs
            // Initially created with Vendor B, then edited to change vendor to Vendor A
            cy.then(() => {
              Invoices.createInvoiceViaApi({
                vendorId: testData.vendorB.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendorB.erpCode,
              }).then((inv2) => {
                testData.invoice2 = inv2;

                // Invoice line for POL #2-1
                Invoices.createInvoiceLineViaApi(
                  Invoices.getDefaultInvoiceLine({
                    invoiceId: inv2.id,
                    invoiceLineStatus: 'Open',
                    poLineId: testData.pol2Line1.id,
                    fundDistributions: testData.pol2Line1.fundDistribution,
                    subTotal: 10,
                    total: 10,
                  }),
                ).then((invLine) => {
                  testData.invLine2Line1 = invLine;
                });

                // Invoice line for POL #2-2
                Invoices.createInvoiceLineViaApi(
                  Invoices.getDefaultInvoiceLine({
                    invoiceId: inv2.id,
                    invoiceLineStatus: 'Open',
                    poLineId: testData.pol2Line2.id,
                    fundDistributions: testData.pol2Line2.fundDistribution,
                    subTotal: 15,
                    total: 15,
                  }),
                ).then((invLine) => {
                  testData.invLine2Line2 = invLine;
                });

                // Update invoice to change vendor from Vendor B to Vendor A
                Invoices.updateInvoiceViaApi({
                  ...inv2,
                  vendorId: testData.vendorA.id,
                  accountingCode: testData.vendorA.erpCode,
                });

                // Approve the invoice (not paid)
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv2,
                  status: INVOICE_STATUSES.APPROVED,
                });
              });
            });
          });

          // Order #3: One-time order, Vendor A, re-encumber enabled, Fund A + Electronic
          const order3 = {
            ...NewOrder.defaultOneTimeOrderAPI,
            id: uuid(),
            vendor: testData.vendorA.id,
            orderType: ORDER_TYPES.ONE_TIME_API,
            reEncumber: true,
          };
          Orders.createOrderViaApi(order3).then((ord3) => {
            testData.order3 = ord3;

            const pol3 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord3.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  expenseClassId: testData.electronicExpenseClassId,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 20,
              poLineEstimatedPrice: 20,
            });
            OrderLines.createOrderLineViaApi(pol3).then((pol3Resp) => {
              testData.pol3 = pol3Resp;

              Orders.updateOrderViaApi({ ...ord3, workflowStatus: ORDER_STATUSES.OPEN });

              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendorA.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendorA.erpCode,
                poLineId: pol3Resp.id,
                fundDistributions: pol3Resp.fundDistribution,
                subTotal: 20,
              }).then((inv3) => {
                testData.invoice3 = inv3;
                InvoiceLineDetails.getInvoiceLinesViaApi({
                  query: `invoiceId=="${inv3.id}"`,
                }).then(({ invoiceLines }) => {
                  testData.invLine3 = invoiceLines[0];
                });
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv3,
                  status: INVOICE_STATUSES.PAID,
                });
              });
            });
          });

          // Invoice #4: Vendor A, three invoice lines
          // Line #1: Independent (not linked to POL), Fund A + Print
          // Line #2: Linked to POL from Order #1
          // Line #3: Linked to POL from Order #3
          cy.then(() => {
            Invoices.createInvoiceViaApi({
              vendorId: testData.vendorA.id,
              fiscalYearId: testData.fiscalYear1.id,
              accountingCode: testData.vendorA.erpCode,
            }).then((inv4) => {
              testData.invoice4 = inv4;

              // Invoice line #1: Independent (not linked to POL), Fund A + Print expense class
              Invoices.createInvoiceLineViaApi(
                Invoices.getDefaultInvoiceLine({
                  invoiceId: inv4.id,
                  invoiceLineStatus: 'Open',
                  fundDistributions: [
                    {
                      code: testData.fundA.code,
                      fundId: testData.fundA.id,
                      distributionType: 'percentage',
                      value: 100,
                      ...(testData.printExpenseClassId
                        ? { expenseClassId: testData.printExpenseClassId }
                        : {}),
                    },
                  ],
                  subTotal: 5,
                  total: 5,
                }),
              ).then((invLine4Line1) => {
                testData.invLine4Line1 = invLine4Line1;
              });

              // Invoice line #2: Linked to POL from Order #1
              Invoices.createInvoiceLineViaApi(
                Invoices.getDefaultInvoiceLine({
                  invoiceId: inv4.id,
                  invoiceLineStatus: 'Open',
                  poLineId: testData.pol1.id,
                  fundDistributions: testData.pol1.fundDistribution,
                  subTotal: 10,
                  total: 10,
                }),
              ).then((invLine4Line2) => {
                testData.invLine4Line2 = invLine4Line2;
              });

              // Invoice line #3: Linked to POL from Order #3
              Invoices.createInvoiceLineViaApi(
                Invoices.getDefaultInvoiceLine({
                  invoiceId: inv4.id,
                  invoiceLineStatus: 'Open',
                  poLineId: testData.pol3.id,
                  fundDistributions: testData.pol3.fundDistribution,
                  subTotal: 20,
                  total: 20,
                }),
              ).then((invLine4Line3) => {
                testData.invLine4Line3 = invLine4Line3;
              });
            });
          });

          // Order #5 (TestRail - Order #4 is skipped): Ongoing, Vendor B, Fund A + Print
          const order5 = {
            ...NewOrder.defaultOngoingTimeOrder,
            id: uuid(),
            vendor: testData.vendorB.id,
            reEncumber: true,
          };
          Orders.createOrderViaApi(order5).then((ord5) => {
            testData.order5 = ord5;

            const pol5 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord5.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  ...(testData.printExpenseClassId
                    ? { expenseClassId: testData.printExpenseClassId }
                    : {}),
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 12,
              poLineEstimatedPrice: 12,
            });
            OrderLines.createOrderLineViaApi(pol5).then((pol5Resp) => {
              testData.pol5 = pol5Resp;

              Orders.updateOrderViaApi({ ...ord5, workflowStatus: ORDER_STATUSES.OPEN });

              // Invoice #5 for Order #5
              // Created with Fund A (from POL), then edited to change fund to Fund B
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendorB.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendorB.erpCode,
                poLineId: pol5Resp.id,
                fundDistributions: pol5Resp.fundDistribution,
                subTotal: 12,
              }).then((inv5) => {
                testData.invoice5 = inv5;

                // Get the invoice line and update fund distribution to Fund B
                InvoiceLineDetails.getInvoiceLinesViaApi({
                  query: `invoiceId=="${inv5.id}"`,
                  limit: 1,
                }).then(({ invoiceLines }) => {
                  testData.invLine5 = invoiceLines[0];
                  InvoiceLineDetails.updateInvoiceLineViaApi({
                    ...invoiceLines[0],
                    fundDistributions: [
                      {
                        code: testData.fundB.code,
                        fundId: testData.fundB.id,
                        distributionType: 'percentage',
                        value: 100,
                      },
                    ],
                  });

                  // Pay the invoice after updating fund distribution
                  Invoices.changeInvoiceStatusViaApi({
                    invoice: inv5,
                    status: INVOICE_STATUSES.PAID,
                  });
                });
              });
            });
          });

          // Order #6: Ongoing, Vendor A, split fund distribution
          // Fund A + Electronic (50%) AND Fund B (amount)
          const order6 = {
            ...NewOrder.defaultOngoingTimeOrder,
            id: uuid(),
            vendor: testData.vendorA.id,
            reEncumber: true,
          };
          Orders.createOrderViaApi(order6).then((ord6) => {
            testData.order6 = ord6;

            const pol6 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord6.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 50, // 50%
                  expenseClassId: testData.electronicExpenseClassId,
                },
                {
                  code: testData.fundB.code,
                  fundId: testData.fundB.id,
                  distributionType: 'amount',
                  value: 9, // specific dollar amount
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 18,
              poLineEstimatedPrice: 18,
            });
            OrderLines.createOrderLineViaApi(pol6).then((pol6Resp) => {
              testData.pol6 = pol6Resp;

              Orders.updateOrderViaApi({ ...ord6, workflowStatus: ORDER_STATUSES.OPEN });

              // Invoice #6 for Order #6 - remains in Open status
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendorA.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendorA.erpCode,
                poLineId: pol6Resp.id,
                fundDistributions: pol6Resp.fundDistribution,
                subTotal: 18,
              }).then((inv6) => {
                testData.invoice6 = inv6;
                // Invoice remains in Open status per TestRail requirements
                // Get invoice line details
                InvoiceLineDetails.getInvoiceLinesViaApi({
                  query: `invoiceId=="${inv6.id}"`,
                }).then(({ invoiceLines }) => {
                  testData.invLine6 = invoiceLines[0];
                });

                // Perform rollover after Invoice #6 creation
                cy.then(() => {
                  const rollover = LedgerRollovers.generateLedgerRollover({
                    ledger: testData.ledger,
                    fromFiscalYear: testData.fiscalYear1,
                    toFiscalYear: testData.fiscalYear2,
                    needCloseBudgets: true,
                    restrictEncumbrance: true,
                    restrictExpenditures: true,
                    budgetsRollover: [
                      {
                        rolloverAllocation: true,
                        rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
                        addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.TRANSFER,
                      },
                    ],
                    encumbrancesRollover: [
                      {
                        orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONGOING,
                        basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
                      },
                      {
                        orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
                        basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
                      },
                    ],
                  });
                  LedgerRollovers.createLedgerRolloverViaApi(rollover);

                  FiscalYears.updateFiscalYearViaApi({
                    ...testData.fiscalYear2,
                    _version: 1,
                    periodStart: `${currentYear}-01-01T00:00:00.000Z`,
                  });
                });

                // Invoice #7: Based on Order #1, FY2, PAID
                Invoices.createInvoiceWithInvoiceLineViaApi({
                  vendorId: testData.vendorA.id,
                  fiscalYearId: testData.fiscalYear2.id,
                  accountingCode: testData.vendorA.erpCode,
                  poLineId: testData.pol1.id,
                  fundDistributions: testData.pol1.fundDistribution,
                  subTotal: 10,
                }).then((inv7) => {
                  testData.invoice7 = inv7;
                  InvoiceLineDetails.getInvoiceLinesViaApi({
                    query: `invoiceId=="${inv7.id}"`,
                  }).then(({ invoiceLines }) => {
                    testData.invLine7 = invoiceLines[0];
                  });
                  Invoices.changeInvoiceStatusViaApi({
                    invoice: inv7,
                    status: INVOICE_STATUSES.PAID,
                  });
                });
              });
            });
          });

          // Order #7: Ongoing, Vendor A, Fund A Electronic, FY2
          createOngoingOrderWithPol(testData.vendorA, testData.fundA, {
            listUnitPrice: 25,
          }).then(({ order: ord7, pol: pol7 }) => {
            testData.order7 = ord7;
            testData.pol7 = pol7;

            // Invoice #8: Based on Order #7, PAID
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.vendorA.id,
              fiscalYearId: testData.fiscalYear2.id,
              accountingCode: testData.vendorA.erpCode,
              poLineId: pol7.id,
              fundDistributions: pol7.fundDistribution,
              subTotal: 25,
            }).then((inv8) => {
              testData.invoice8 = inv8;
              Invoices.changeInvoiceStatusViaApi({
                invoice: inv8,
                status: INVOICE_STATUSES.PAID,
              });
            });
          });
        });

        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiOrganizationsView.gui,
          Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        OrderLinesLimit.setPOLLimitViaApi(1);
        Users.deleteViaApi(testData.user.userId);

        [
          testData.invoice1,
          testData.invoice2,
          testData.invoice3,
          testData.invoice4,
          testData.invoice5,
          testData.invoice6,
          testData.invoice7,
          testData.invoice8,
        ].forEach((inv) => {
          if (inv?.id) Invoices.deleteInvoiceViaApi(inv.id, { failOnStatusCode: false });
        });

        [
          testData.order1,
          testData.order2,
          testData.order3,
          testData.order5,
          testData.order6,
          testData.order7,
        ].forEach((ord) => {
          if (ord?.id) Orders.deleteOrderViaApi(ord.id, false);
        });

        Organizations.deleteOrganizationViaApi(testData.vendorA.id);
        Organizations.deleteOrganizationViaApi(testData.vendorB.id);

        if (testData.budgetA?.id) Budgets.deleteViaApi(testData.budgetA.id, false);
        if (testData.budgetB?.id) Budgets.deleteViaApi(testData.budgetB.id, false);
        if (testData.fundA?.id) Funds.deleteFundViaApi(testData.fundA.id, false);
        if (testData.fundB?.id) Funds.deleteFundViaApi(testData.fundB.id, false);
        if (testData.ledger?.id) Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
        if (testData.fiscalYear1?.id) {
          FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear1.id, false);
        }
        if (testData.fiscalYear2?.id) {
          FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear2.id, false);
        }
      });

      it(
        'C736712 Order - Invoice Analytics: Provide reports with several parameters (order type, invoice FY for a certain vendor) and one parameter (fund code) (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C736712', 'nonParallel'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Click "New" button, fill "List name", select "Order - Invoice Analytics" record type, click "Build query"
          Lists.openNewListPane();
          Lists.setName(testData.listName1);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2: Start to build query - Select "PO - Order type" = "Ongoing"
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.PO.ORDER_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(ORDER_TYPES.ONGOING);
          QueryModal.verifyQueryAreaContent(`(po.order_type == ${ORDER_TYPES.ONGOING})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 3: Add one more line - Select "Invoice - Fiscal year" = first FY
          QueryModal.addNewRow();
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.FISCAL_YEAR, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.chooseValueSelect(testData.fiscalYear1.name, 1);
          QueryModal.verifyQueryAreaContent(
            `(po.order_type == ${ORDER_TYPES.ONGOING}) AND (invoice.fiscal_year == ${testData.fiscalYear1.name})`,
          );
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 4: Add one more line - Select "Invoice - Vendor name" = Vendor A
          QueryModal.addNewRow(1);
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.VENDOR_NAME, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.clickOrganizationLookup(2);
          SelectOrganizationModal.findOrganization(testData.vendorA.name, 2);
          QueryModal.verifyQueryAreaContent(
            `(po.order_type == ${ORDER_TYPES.ONGOING}) AND (invoice.fiscal_year == ${testData.fiscalYear1.name}) AND (invoice.vendor_name == ${testData.vendorA.name})`,
          );
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 5: Click "Test query" button - verify at least 6 records returned
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          // Expected: Invoice #1 (1 row) + Invoice #2 (2 rows) + Invoice #4 line #2 (1 row) + Invoice #6 (2 rows for split fund) = 6 rows
          QueryModal.verifyNumberOfRowsInPreviewTable(6);

          // Step 6: Click "Show columns" button, uncheck all checkboxes and check specific columns per TestRail
          // Columns: PO line number, Invoice vendor invoice number, Invoice line number, Fund distribution amount, Fund distribution value, Sub-total, Fund code, Expense class name
          QueryModal.clickShowColumnsButton();
          QueryModal.uncheckAllShowColumns();
          columnsForMultiParamQuery.forEach((col) => QueryModal.selectCheckboxInShowColumns(col));
          QueryModal.scrollResultTable('right');
          columnsForMultiParamQuery.forEach((col) => QueryModal.verifyColumnDisplayed(col));

          // Invoice #1: POL #1-1, Fund A, Print expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol1.poLineNumber}\n${testData.invoice1.vendorInvoiceNo}\n1\n100.0%\n10\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #2: POL #2-1, Fund A, Electronic expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol2Line1.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n1\n100.0%\n10\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #2: POL #2-2, Fund A, Print expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol2Line2.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n2\n100.0%\n15\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #4 line #2: POL from Order #1, Fund A, Electronic expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol1.poLineNumber}\n${testData.invoice4.vendorInvoiceNo}\n2\n100.0%\n${testData.invLine4Line2.subTotal}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #6: POL #6-1, Fund A, Electronic expense class, 50% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol6.poLineNumber}\n${testData.invoice6.vendorInvoiceNo}\n1\n50.0%\n18\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #6: POL #6-1, Fund B, amount $9 (no percentage, no expense class)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol6.poLineNumber}\n${testData.invoice6.vendorInvoiceNo}\n1\n9.0\n9.0\n18\n${testData.fundB.code}`,
          );

          // The following invoices / invoice lines are NOT displayed in the list (per TestRail Step 6):
          // Invoice #3 (related to one-time order)
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice3.vendorInvoiceNo,
          );
          // Invoice line #1 from Invoice #4 (not related to any POL) - independent line
          // Invoice line #3 from Invoice #4 (related to one-time order, Order #3)
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol3.poLineNumber);
          // Invoice #5 (for "Vendor B")
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice5.vendorInvoiceNo,
          );
          // Invoice #7 (second FY)
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice7.vendorInvoiceNo,
          );
          // Invoice #8 (second FY)
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice8.vendorInvoiceNo,
          );

          // Step 7: Click "Run query & save" button, click "View updated list" link after refresh
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);

          // Verify the same list with columns selected in previous step is displayed
          QueryModal.scrollResultTable('right');
          columnsForMultiParamQuery.forEach((col) => QueryModal.verifyColumnDisplayed(col));
          // Invoice #1: POL #1-1, Fund A, Print expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol1.poLineNumber}\n${testData.invoice1.vendorInvoiceNo}\n1\n100.0%\n10\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #2: POL #2-1, Fund A, Electronic expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol2Line1.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n1\n100.0%\n10\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #2: POL #2-2, Fund A, Print expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol2Line2.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n2\n100.0%\n15\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #4 line #2: POL from Order #1, Fund A, Electronic expense class, 100% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol1.poLineNumber}\n${testData.invoice4.vendorInvoiceNo}\n2\n100.0%\n${testData.invLine4Line2.subTotal}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #6: POL #6-1, Fund A, Electronic expense class, 50% (no amount)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol6.poLineNumber}\n${testData.invoice6.vendorInvoiceNo}\n1\n50.0%\n18\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #6: POL #6-1, Fund B, amount $9 (no percentage, no expense class)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.pol6.poLineNumber}\n${testData.invoice6.vendorInvoiceNo}\n1\n9.0\n9.0\n18\n${testData.fundB.code}`,
          );

          // The following invoices / invoice lines are NOT displayed in the list (per TestRail Step 7):
          // Invoice #3 (related to one-time order)
          Lists.verifyRecordValueAbsentInResultTable(testData.invoice3.vendorInvoiceNo);
          // Invoice line #1 from Invoice #4 (not related to any POL) - independent line
          // Invoice line #3 from Invoice #4 (related to one-time order, Order #3)
          Lists.verifyRecordValueAbsentInResultTable(testData.pol3.poLineNumber);
          // Invoice #5 (for "Vendor B")
          Lists.verifyRecordValueAbsentInResultTable(testData.invoice5.vendorInvoiceNo);
          // Invoice #7 (second FY)
          Lists.verifyRecordValueAbsentInResultTable(testData.invoice7.vendorInvoiceNo);
          // Invoice #8 (second FY)
          Lists.verifyRecordValueAbsentInResultTable(testData.invoice8.vendorInvoiceNo);

          Lists.closeListDetailsPane();

          // Step 8: Build another query - Close List details page, click "New" button, fill "List name", select "Order - Invoice Analytics", click "Build query"
          Lists.openNewListPane();
          Lists.setName(testData.listName2);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 9: Start to build query - Select "Fund - Code" = Fund A
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.FUND.CODE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(testData.fundA.code);
          QueryModal.verifyQueryAreaContent(`(fund.code == ${testData.fundA.code})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 10: Click "Test query" button - verify at least 9 records returned
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          // Expected: Invoice #1 (1) + Invoice #2 (2) + Invoice #3 (1) + Invoice #4 lines #2 & #3 (2) + Invoice #6 (1) + Invoice #7 (1) + Invoice #8 (1) = 9 rows
          // Note: Order 5 excluded - invoice line fund changed to Fund B; Invoice #4 line #1 excluded - not related to POL
          QueryModal.verifyNumberOfRowsInPreviewTable(9);

          // Step 11: Click "Show columns" button, uncheck all checkboxes and check specific columns per TestRail
          // Columns: Order type, Organization code, PO line number, Invoice vendor invoice number, Invoice line number, Sub-total, Fiscal year, Fund code, Expense class name
          QueryModal.clickShowColumnsButton();
          QueryModal.uncheckAllShowColumns();
          columnsForSingleParamQuery.forEach((col) => QueryModal.selectCheckboxInShowColumns(col));
          QueryModal.scrollResultTable('right');
          columnsForSingleParamQuery.forEach((col) => QueryModal.verifyColumnDisplayed(col));

          // Invoice #1: Ongoing, Vendor A, POL #1-1, FY #1, Fund A, Print
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol1.poLineNumber}\n${testData.invoice1.vendorInvoiceNo}\n1\n10\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #2: POL #2-1, Ongoing, Vendor A, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol2Line1.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n1\n10\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #2: POL #2-2, Ongoing, Vendor A, FY #1, Fund A, Print
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol2Line2.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n2\n15\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #3: One-time, Vendor A, POL #3-1, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONE_TIME_API}\n${testData.vendorA.code}\n${testData.pol3.poLineNumber}\n${testData.invoice3.vendorInvoiceNo}\n1\n${testData.invLine3.subTotal}\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #4 line #2: linked to Order #1 POL, Ongoing, Vendor A, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol1.poLineNumber}\n${testData.invoice4.vendorInvoiceNo}\n2\n${testData.invLine4Line2.subTotal}\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #4 line #3: linked to Order #3 POL, One-time, Vendor A, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONE_TIME_API}\n${testData.vendorA.code}\n${testData.pol3.poLineNumber}\n${testData.invoice4.vendorInvoiceNo}\n3\n${testData.invLine4Line3.subTotal}\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #6: Ongoing, Vendor A, POL #6-1, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol6.poLineNumber}\n${testData.invoice6.vendorInvoiceNo}\n1\n18\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #7: based on Order #1, Ongoing, Vendor A, FY #2, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol1.poLineNumber}\n${testData.invoice7.vendorInvoiceNo}\n1\n${testData.invLine7.subTotal}\n${testData.fiscalYear2.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #8: Ongoing, Vendor A, POL #7-1, FY #2, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol7.poLineNumber}\n${testData.invoice8.vendorInvoiceNo}\n1\n25\n${testData.fiscalYear2.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );

          // The following invoices / invoice lines are NOT displayed in the list (per TestRail Step 11):
          // Invoice line #1 from Invoice #4 (not related to POL) - independent line
          // Invoice #5 (for "Vendor B")
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice5.vendorInvoiceNo,
          );
          // Invoice #6 (for "Fund B" distribution) - verify Fund B is not in results
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.fundB.code);

          // Step 12: Click "Run query & save" button, click "View updated list" link after refresh
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);

          // Verify the same list with columns selected in previous step is displayed
          QueryModal.scrollResultTable('right');
          columnsForSingleParamQuery.forEach((col) => QueryModal.verifyColumnDisplayed(col));
          // Invoice #1: Ongoing, Vendor A, POL #1-1, FY #1, Fund A, Print
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol1.poLineNumber}\n${testData.invoice1.vendorInvoiceNo}\n1\n10\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #2: POL #2-1, Ongoing, Vendor A, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol2Line1.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n1\n10\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #2: POL #2-2, Ongoing, Vendor A, FY #1, Fund A, Print
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol2Line2.poLineNumber}\n${testData.invoice2.vendorInvoiceNo}\n2\n15\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.printExpenseClassName}`,
          );
          // Invoice #3: One-time, Vendor A, POL #3-1, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONE_TIME_API}\n${testData.vendorA.code}\n${testData.pol3.poLineNumber}\n${testData.invoice3.vendorInvoiceNo}\n1\n${testData.invLine3.subTotal}\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #4 line #2: linked to Order #1 POL, Ongoing, Vendor A, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol1.poLineNumber}\n${testData.invoice4.vendorInvoiceNo}\n2\n${testData.invLine4Line2.subTotal}\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #4 line #3: linked to Order #3 POL, One-time, Vendor A, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONE_TIME_API}\n${testData.vendorA.code}\n${testData.pol3.poLineNumber}\n${testData.invoice4.vendorInvoiceNo}\n3\n${testData.invLine4Line3.subTotal}\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #6: Ongoing, Vendor A, POL #6-1, FY #1, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol6.poLineNumber}\n${testData.invoice6.vendorInvoiceNo}\n1\n18\n${testData.fiscalYear1.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #7: based on Order #1, Ongoing, Vendor A, FY #2, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol1.poLineNumber}\n${testData.invoice7.vendorInvoiceNo}\n1\n${testData.invLine7.subTotal}\n${testData.fiscalYear2.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );
          // Invoice #8: Ongoing, Vendor A, POL #7-1, FY #2, Fund A, Electronic
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.vendorA.code}\n${testData.pol7.poLineNumber}\n${testData.invoice8.vendorInvoiceNo}\n1\n25\n${testData.fiscalYear2.name}\n${testData.fundA.code}\n${testData.electronicExpenseClassName}`,
          );

          // The following invoices / invoice lines are NOT displayed in the list (per TestRail Step 12):
          // Invoice line #1 from Invoice #4 (not related to POL) - independent line
          // Invoice #5 (for "Vendor B")
          Lists.verifyRecordValueAbsentInResultTable(testData.invoice5.vendorInvoiceNo);
          // Invoice #6 (for "Fund B" distribution) - verify Fund B is not in results
          Lists.verifyRecordValueAbsentInResultTable(testData.fundB.code);
        },
      );
    });
  });
});
