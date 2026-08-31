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
import Formats from '../../../../support/fragments/settings/inventory/instances/formats';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import OrderLinesLimit from '../../../../support/fragments/settings/orders/orderLinesLimit';
import getRandomPostfix, { getTestEntityValue } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import { CodeTools, StringTools } from '../../../../support/utils';

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
  instance: { id: uuid() },
  formatName: null,
  order1: {},
  order2: {},
  order3: {},
  order4: {},
  order5: {},
  order6: {},
  invoice1: {},
  invoice2: {},
  invoice3: {},
  invoice4: {},
  invoice5: {},
  invoice6: {},
  listName: getTestEntityValue('C736721_List'),
};

const columnsToSelect = [
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.FOLIO_INVOICE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.INVOICE_LINE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.TOTAL,
  ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE.TITLE_OR_PACKAGE,
  ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
  ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.NAME,
  ORDER_INVOICE_ANALYSIS_FIELDS.FUND.NAME,
];

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Invoice Order Analytics', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        OrderLinesLimit.setPOLLimitViaApi(3);
        cy.wait(2000); // Wait for POL limit to be applied before creating orders
        // Create vendor organizations
        Organizations.createOrganizationViaApi(testData.vendorA).then((id) => {
          testData.vendorA.id = id;
        });
        Organizations.createOrganizationViaApi(testData.vendorB).then((id) => {
          testData.vendorB.id = id;
        });

        // Get expense class IDs
        ExpenseClasses.getExpenseClassesViaApi({ query: 'name=="Electronic"', limit: 1 }).then(
          (classes) => {
            testData.electronicExpenseClassId = classes[0]?.id;
          },
        );
        ExpenseClasses.getExpenseClassesViaApi({ query: 'name=="Print"', limit: 1 }).then(
          (classes) => {
            testData.printExpenseClassId = classes[0]?.id;
          },
        );

        // Get instance format for step 9 filter
        Formats.getViaApi({ query: 'name=="computer -- other"', limit: 1 }).then((formats) => {
          if (formats?.length) {
            testData.formatId = formats[0].id;
            testData.formatName = formats[0].name;
          } else {
            Formats.getViaApi({ limit: 1 }).then((anyFormats) => {
              testData.formatId = anyFormats[0].id;
              testData.formatName = anyFormats[0].name;
            });
          }
        });

        // Get instance type
        cy.getInstanceTypes({ limit: 1 });

        // Create Fiscal Year 1 (current year — becomes "last year" after rollover + date swap)
        FiscalYears.createViaApi(testData.fiscalYear1).then((fy1) => {
          testData.fiscalYear1 = fy1;

          // Create Ledger linked to FY1
          const ledger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: fy1.id,
            restrictExpenditures: false,
            restrictEncumbrance: false,
          };
          Ledgers.createViaApi(ledger).then((createdLedger) => {
            testData.ledger = createdLedger;

            // Create Fund A
            const fundA = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fundA).then((fundAResp) => {
              testData.fundA = fundAResp.fund;

              // Create Fund A budget with expense classes
              const budgetA = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy1.id,
                fundId: fundAResp.fund.id,
                allocated: 1000,
              };
              Budgets.createViaApi(budgetA).then((budgetAResp) => {
                testData.budgetA = budgetAResp;
                // Add expense classes to budget A after getting class IDs
                cy.then(() => {
                  if (testData.electronicExpenseClassId && testData.printExpenseClassId) {
                    Budgets.updateBudgetViaApi({
                      ...budgetAResp,
                      statusExpenseClasses: [
                        { status: 'Active', expenseClassId: testData.electronicExpenseClassId },
                        { status: 'Active', expenseClassId: testData.printExpenseClassId },
                      ],
                    });
                  }
                });
              });
            });

            // Create Fund B
            const fundB = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fundB).then((fundBResp) => {
              testData.fundB = fundBResp.fund;

              // Create Fund B budget
              const budgetB = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy1.id,
                fundId: fundBResp.fund.id,
                allocated: 1000,
              };
              Budgets.createViaApi(budgetB).then((budgetBResp) => {
                testData.budgetB = budgetBResp;
              });
            });
          });
        });

        // Create Fiscal Year 2 (next year — becomes "current year" after date swap)
        FiscalYears.createViaApi(testData.fiscalYear2).then((fy2) => {
          testData.fiscalYear2 = fy2;
        });

        // Get location, acquisition method, material type for PO lines
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

        // Once all data is ready, create instance + orders + invoices
        cy.then(() => {
          // Create instance with "computer -- other" format for POL #1
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              id: testData.instance.id,
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: `AT_C736721_Instance_${getRandomPostfix()}`,
              ...(testData.formatId ? { instanceFormatIds: [testData.formatId] } : {}),
            },
          });

          // ── Order #1 (Vendor A, 3 PO lines, re-encumber) ──────────────────────
          const order1 = {
            ...NewOrder.defaultOngoingTimeOrder,
            id: uuid(),
            vendor: testData.vendorA.id,
            reEncumber: true,
          };
          Orders.createOrderViaApi(order1).then((ord1) => {
            testData.order1 = ord1;

            // POL #1: Fund A + Electronic, linked to instance with format
            const pol1 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord1.id,
              instanceId: testData.instance.id,
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
            OrderLines.createOrderLineViaApi(pol1).then((pol1Resp) => {
              testData.pol1 = pol1Resp;
            });

            // POL #2: Fund B
            const pol2 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord1.id,
              fundDistribution: [
                {
                  code: testData.fundB.code,
                  fundId: testData.fundB.id,
                  distributionType: 'percentage',
                  value: 100,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 15,
              poLineEstimatedPrice: 15,
            });
            OrderLines.createOrderLineViaApi(pol2).then((pol2Resp) => {
              testData.pol2 = pol2Resp;
            });

            // POL #3: Fund A (50%) + Fund B (50%)
            const pol3 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord1.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 50,
                  expenseClassId: testData.electronicExpenseClassId,
                },
                {
                  code: testData.fundB.code,
                  fundId: testData.fundB.id,
                  distributionType: 'percentage',
                  value: 50,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
            });
            OrderLines.createOrderLineViaApi(pol3).then((pol3Resp) => {
              testData.pol3 = pol3Resp;
            });

            // Open Order #1
            Orders.updateOrderViaApi({ ...ord1, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
              // Create Invoice #1 with adjustment, change expense class on line 1, then pay
              Invoices.createInvoiceViaApi({
                vendorId: testData.vendorA.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendorA.erpCode,
                adjustments: [
                  {
                    description: 'VAT',
                    value: 9,
                    type: 'Amount',
                    prorate: 'By line',
                    relationToTotal: 'In addition to',
                  },
                ],
              }).then((inv1) => {
                testData.invoice1 = inv1;

                // Invoice line 1 (initially Fund A + Electronic)
                Invoices.createInvoiceLineViaApi(
                  Invoices.getDefaultInvoiceLine({
                    invoiceId: inv1.id,
                    invoiceLineStatus: inv1.status,
                    poLineId: testData.pol1.id,
                    subTotal: 20,
                    accountingCode: testData.vendorA.erpCode,
                    fundDistributions: [
                      {
                        code: testData.fundA.code,
                        fundId: testData.fundA.id,
                        distributionType: 'percentage',
                        value: 100,
                        expenseClassId: testData.electronicExpenseClassId,
                      },
                    ],
                  }),
                ).then((invLine1) => {
                  testData.invLine1 = invLine1;
                  // Update line 1: change expense class from Electronic to Print
                  InvoiceLineDetails.updateInvoiceLineViaApi({
                    ...invLine1,
                    fundDistributions: [
                      {
                        code: testData.fundA.code,
                        fundId: testData.fundA.id,
                        distributionType: 'percentage',
                        value: 100,
                        expenseClassId: testData.printExpenseClassId,
                      },
                    ],
                  });
                });

                // Invoice line 2 (Fund B)
                Invoices.createInvoiceLineViaApi(
                  Invoices.getDefaultInvoiceLine({
                    invoiceId: inv1.id,
                    invoiceLineStatus: inv1.status,
                    poLineId: testData.pol2.id,
                    subTotal: 15,
                    accountingCode: testData.vendorA.erpCode,
                    fundDistributions: [
                      {
                        code: testData.fundB.code,
                        fundId: testData.fundB.id,
                        distributionType: 'percentage',
                        value: 100,
                      },
                    ],
                  }),
                ).then((invLine2) => {
                  testData.invLine2 = invLine2;
                });

                // Invoice line 3 (Fund A 50% + Fund B 50%)
                Invoices.createInvoiceLineViaApi(
                  Invoices.getDefaultInvoiceLine({
                    invoiceId: inv1.id,
                    invoiceLineStatus: inv1.status,
                    poLineId: testData.pol3.id,
                    subTotal: 10,
                    accountingCode: testData.vendorA.erpCode,
                    fundDistributions: [
                      {
                        code: testData.fundA.code,
                        fundId: testData.fundA.id,
                        distributionType: 'percentage',
                        value: 50,
                        expenseClassId: testData.electronicExpenseClassId,
                      },
                      {
                        code: testData.fundB.code,
                        fundId: testData.fundB.id,
                        distributionType: 'percentage',
                        value: 50,
                      },
                    ],
                  }),
                ).then((invLine3) => {
                  testData.invLine3 = invLine3;
                });

                // Pay Invoice #1
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv1,
                  status: INVOICE_STATUSES.PAID,
                });
                // Re-fetch lines to capture their final totals (adjustedAmount includes prorated VAT)
                InvoiceLineDetails.getInvoiceLinesViaApi({
                  query: `invoiceId=="${inv1.id}"`,
                  limit: 10,
                }).then(({ invoiceLines }) => {
                  testData.invLine1 =
                    invoiceLines.find((l) => l.poLineId === testData.pol1.id) || testData.invLine1;
                  testData.invLine2 =
                    invoiceLines.find((l) => l.poLineId === testData.pol2.id) || testData.invLine2;
                  testData.invLine3 =
                    invoiceLines.find((l) => l.poLineId === testData.pol3.id) || testData.invLine3;
                });
              });
            });
          });

          // ── Helper to create a simple ongoing order with 1 POL (Fund B, Vendor A) ──
          const createOrderWithPol = (vendor, { listUnitPrice = 10 } = {}) => {
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
                    code: testData.fundB.code,
                    fundId: testData.fundB.id,
                    distributionType: 'percentage',
                    value: 100,
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

          // ── Order #2 + Invoice #2 (Open) ──────────────────────────────────────
          createOrderWithPol(testData.vendorA).then(({ order: ord2, pol: pol2s }) => {
            testData.order2 = ord2;
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.vendorA.id,
              fiscalYearId: testData.fiscalYear1.id,
              accountingCode: testData.vendorA.erpCode,
              poLineId: pol2s.id,
              fundDistributions: pol2s.fundDistribution,
              subTotal: 10,
            }).then((inv2) => {
              testData.invoice2 = inv2;
              // Leave in Open status
            });
          });

          // ── Order #3 + Invoice #3 (Reviewed) ─────────────────────────────────
          createOrderWithPol(testData.vendorA).then(({ order: ord3, pol: pol3s }) => {
            testData.order3 = ord3;
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.vendorA.id,
              fiscalYearId: testData.fiscalYear1.id,
              accountingCode: testData.vendorA.erpCode,
              poLineId: pol3s.id,
              fundDistributions: pol3s.fundDistribution,
              subTotal: 10,
            }).then((inv3) => {
              testData.invoice3 = inv3;
              Invoices.changeInvoiceStatusViaApi({
                invoice: inv3,
                status: INVOICE_STATUSES.REVIEWED,
              });
            });
          });

          // ── Order #4 + Invoice #4 (Approved) ─────────────────────────────────
          createOrderWithPol(testData.vendorA).then(({ order: ord4, pol: pol4s }) => {
            testData.order4 = ord4;
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.vendorA.id,
              fiscalYearId: testData.fiscalYear1.id,
              accountingCode: testData.vendorA.erpCode,
              poLineId: pol4s.id,
              fundDistributions: pol4s.fundDistribution,
              subTotal: 10,
            }).then((inv4) => {
              testData.invoice4 = inv4;
              Invoices.changeInvoiceStatusViaApi({
                invoice: inv4,
                status: INVOICE_STATUSES.APPROVED,
              });
            });
          });

          // ── Order #5 + Invoice #5 (Paid → Cancelled) ─────────────────────────
          createOrderWithPol(testData.vendorA).then(({ order: ord5, pol: pol5s }) => {
            testData.order5 = ord5;
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.vendorA.id,
              fiscalYearId: testData.fiscalYear1.id,
              accountingCode: testData.vendorA.erpCode,
              poLineId: pol5s.id,
              fundDistributions: pol5s.fundDistribution,
              subTotal: 10,
            }).then((inv5) => {
              testData.invoice5 = inv5;
              Invoices.changeInvoiceStatusViaApi({ invoice: inv5, status: INVOICE_STATUSES.PAID });
              Invoices.changeInvoiceStatusViaApi({
                invoice: inv5,
                status: INVOICE_STATUSES.CANCELLED,
              });
            });
          });

          // ── Order #6 + Invoice #6 (Vendor B, Fund B → Fund A + Electronic, Approved) ──
          const order6 = {
            ...NewOrder.defaultOngoingTimeOrder,
            id: uuid(),
            vendor: testData.vendorB.id,
            reEncumber: true,
          };
          Orders.createOrderViaApi(order6).then((ord6) => {
            testData.order6 = ord6;
            const pol6 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord6.id,
              fundDistribution: [
                {
                  code: testData.fundB.code,
                  fundId: testData.fundB.id,
                  distributionType: 'percentage',
                  value: 100,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 12,
              poLineEstimatedPrice: 12,
            });
            OrderLines.createOrderLineViaApi(pol6).then((pol6Resp) => {
              testData.pol6 = pol6Resp;
              Orders.updateOrderViaApi({ ...ord6, workflowStatus: ORDER_STATUSES.OPEN }).then(
                () => {
                  Invoices.createInvoiceWithInvoiceLineViaApi({
                    vendorId: testData.vendorB.id,
                    fiscalYearId: testData.fiscalYear1.id,
                    accountingCode: testData.vendorB.erpCode,
                    poLineId: pol6Resp.id,
                    fundDistributions: pol6Resp.fundDistribution,
                    subTotal: 12,
                  }).then((inv6) => {
                    testData.invoice6 = inv6;
                    // Update invoice line: change sub-total and fund distribution to Fund A + Electronic
                    InvoiceLineDetails.getInvoiceLinesViaApi({
                      query: `invoiceId=="${inv6.id}"`,
                      limit: 1,
                    }).then(({ invoiceLines }) => {
                      testData.invLine6 = invoiceLines[0];
                      InvoiceLineDetails.updateInvoiceLineViaApi({
                        ...invoiceLines[0],
                        subTotal: 18, // different from POL amount of 12
                        fundDistributions: [
                          {
                            code: testData.fundA.code,
                            fundId: testData.fundA.id,
                            distributionType: 'percentage',
                            value: 100,
                            expenseClassId: testData.electronicExpenseClassId,
                          },
                        ],
                      });
                    });

                    // Approve Invoice #6
                    Invoices.changeInvoiceStatusViaApi({
                      invoice: inv6,
                      status: INVOICE_STATUSES.APPROVED,
                    });
                  });
                },
              );
            });
          });

          // ── Rollover: FY1 → FY2 ───────────────────────────────────────────────
          cy.then(() => {
            const rollover = LedgerRollovers.generateLedgerRollover({
              ledger: testData.ledger,
              fromFiscalYear: testData.fiscalYear1,
              toFiscalYear: testData.fiscalYear2,
              needCloseBudgets: false,
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
              ],
            });
            LedgerRollovers.createLedgerRolloverViaApi(rollover);

            // Swap FY dates: FY1 → last year, FY2 → current year
            FiscalYears.updateFiscalYearViaApi({
              ...testData.fiscalYear1,
              _version: 1,
              periodStart: new Date(currentYear - 1, 0, 1),
              periodEnd: new Date(currentYear - 1, 11, 31),
            });
            FiscalYears.updateFiscalYearViaApi({
              ...testData.fiscalYear2,
              _version: 1,
              periodStart: new Date(currentYear, 0, 1),
              periodEnd: new Date(currentYear, 11, 31),
            });

            // Pay Invoice #6 in new FY for previous FY
            Invoices.changeInvoiceStatusViaApi({
              invoice: testData.invoice6,
              status: INVOICE_STATUSES.PAID,
            });
            // Re-fetch Invoice #6 line to capture final adjustedAmount
            InvoiceLineDetails.getInvoiceLinesViaApi({
              query: `invoiceId=="${testData.invoice6.id}"`,
              limit: 1,
            }).then(({ invoiceLines }) => {
              if (invoiceLines[0]) testData.invLine6 = invoiceLines[0];
            });
          });
        });

        // Create test user with required permissions
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

        // Delete invoices
        [
          testData.invoice1,
          testData.invoice2,
          testData.invoice3,
          testData.invoice4,
          testData.invoice5,
          testData.invoice6,
        ].forEach((inv) => {
          if (inv?.id) Invoices.deleteInvoiceViaApi(inv.id, { failOnStatusCode: false });
        });

        // Delete orders (cascades to POLs)
        [
          testData.order1,
          testData.order2,
          testData.order3,
          testData.order4,
          testData.order5,
          testData.order6,
        ].forEach((ord) => {
          if (ord?.id) Orders.deleteOrderViaApi(ord.id, false);
        });

        // Delete organizations
        Organizations.deleteOrganizationViaApi(testData.vendorA.id);
        Organizations.deleteOrganizationViaApi(testData.vendorB.id);

        // Delete finance: budgets → funds → ledger → fiscal years
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
        'C736721 Order - Invoice Analytics: Provide a list of what was paid for ongoing orders for each vendor last fiscal year (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C736721', 'nonParallel'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Create new list with "Order — Invoice Analysis" record type, click Build query
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step 2: Select "PO — Order type" = Ongoing
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.PO.ORDER_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(ORDER_TYPES.ONGOING);
          QueryModal.verifyQueryAreaContent(`(po.order_type == ${ORDER_TYPES.ONGOING})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 3: Add "Invoice — Fiscal year" = FY1
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

          // Step 4: Add "Invoice — Status" = Paid
          QueryModal.addNewRow(1);
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.STATUS, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.chooseValueSelect(INVOICE_STATUSES.PAID, 2);
          QueryModal.verifyQueryAreaContent(
            `(po.order_type == ${ORDER_TYPES.ONGOING}) AND (invoice.fiscal_year == ${testData.fiscalYear1.name}) AND (invoice.status == ${INVOICE_STATUSES.PAID})`,
          );
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 5: Test query — verify at least 5 records returned
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(5);

          // Step 6: Configure columns and verify expected columns are displayed
          QueryModal.clickShowColumnsButton();
          QueryModal.uncheckAllShowColumns();
          columnsToSelect.forEach((col) => QueryModal.selectCheckboxInShowColumns(col));
          columnsToSelect.forEach((col) => QueryModal.verifyColumnDisplayed(col));

          // Columns: folioInvoiceNo | invoiceLineNumber | total | polTitle | vendorCode | [expenseClass |] fundName
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine1.invoiceLineNumber}\n${testData.invLine1.total.toString()}\n${testData.pol1.titleOrPackage}\n${testData.vendorA.code}\nPrint\n${testData.fundA.name}`,
          );
          // Row: Invoice #1 line #2 — Fund B (no expense class), Vendor A
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine2.invoiceLineNumber}\n${testData.invLine2.total.toString()}\n${testData.pol2.titleOrPackage}\n${testData.vendorA.code}\n${testData.fundB.name}`,
          );
          // Row: Invoice #1 line #3 — Fund A split (Electronic), Vendor A
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine3.invoiceLineNumber}\n${testData.invLine3.total.toString()}\n${testData.pol3.titleOrPackage}\n${testData.vendorA.code}\nElectronic\n${testData.fundA.name}`,
          );
          // Row: Invoice #1 line #3 — Fund B split (no expense class), Vendor A
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine3.invoiceLineNumber}\n${testData.invLine3.total.toString()}\n${testData.pol3.titleOrPackage}\n${testData.vendorA.code}\n${testData.fundB.name}`,
          );
          // Row: Invoice #6 line #1 — Fund A (Electronic), Vendor B
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice6.folioInvoiceNo}\n${testData.invLine6.invoiceLineNumber}\n${testData.invLine6.total.toString()}\n${testData.pol6.titleOrPackage}\n${testData.vendorB.code}\nElectronic\n${testData.fundA.name}`,
          );
          // Invoices #2 (Open), #3 (Reviewed), #4 (Approved), #5 (Cancelled) must not appear
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice2.folioInvoiceNo,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice3.folioInvoiceNo,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice4.folioInvoiceNo,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.invoice5.folioInvoiceNo,
          );

          // Step 7: Run query & save, then view updated list
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);
          columnsToSelect.forEach((col) => QueryModal.verifyColumnDisplayed(col));
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine1.invoiceLineNumber}\n${testData.invLine1.total.toString()}\n${testData.pol1.titleOrPackage}\n${testData.vendorA.code}\nPrint\n${testData.fundA.name}`,
          );
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine2.invoiceLineNumber}\n${testData.invLine2.total.toString()}\n${testData.pol2.titleOrPackage}\n${testData.vendorA.code}\n${testData.fundB.name}`,
          );
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine3.invoiceLineNumber}\n${testData.invLine3.total.toString()}\n${testData.pol3.titleOrPackage}\n${testData.vendorA.code}\nElectronic\n${testData.fundA.name}`,
          );
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine3.invoiceLineNumber}\n${testData.invLine3.total.toString()}\n${testData.pol3.titleOrPackage}\n${testData.vendorA.code}\n${testData.fundB.name}`,
          );
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice6.folioInvoiceNo}\n${testData.invLine6.invoiceLineNumber}\n${testData.invLine6.total.toString()}\n${testData.pol6.titleOrPackage}\n${testData.vendorB.code}\nElectronic\n${testData.fundA.name}`,
          );
          QueryModal.verifyResultFound(testData.invoice2.folioInvoiceNo, { isFound: false });
          QueryModal.verifyResultFound(testData.invoice3.folioInvoiceNo, { isFound: false });
          QueryModal.verifyResultFound(testData.invoice4.folioInvoiceNo, { isFound: false });
          QueryModal.verifyResultFound(testData.invoice5.folioInvoiceNo, { isFound: false });

          // Step 8: Edit query via Actions → Edit list → Edit query
          Lists.openActions();
          Lists.editList();
          Lists.editQuery();

          // Step 9: Add "Instance — Format names" filter to narrow to 1 row
          QueryModal.addNewRow(2);
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.INSTANCE.FORMAT_NAMES, 3);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 3);
          QueryModal.chooseValueSelect(testData.formatName, 3);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine1.invoiceLineNumber}\n${testData.invLine1.total.toString()}\n${testData.pol1.titleOrPackage}\n${testData.vendorA.code}\nPrint\n${testData.fundA.name}\n${ORDER_TYPES.ONGOING}\n${testData.fiscalYear1.name}\n${INVOICE_STATUSES.PAID}\n${testData.formatName}`,
          );
        },
      );
    });
  });
});
