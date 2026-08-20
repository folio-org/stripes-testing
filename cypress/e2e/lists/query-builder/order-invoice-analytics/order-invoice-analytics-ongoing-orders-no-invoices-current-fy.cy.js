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
} from '../../../../support/constants/finance/rollover';
import Funds from '../../../../support/fragments/finance/funds/funds';
import { Invoices } from '../../../../support/fragments/invoices';
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
import OrderLinesLimit from '../../../../support/fragments/settings/orders/orderLinesLimit';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import { CodeTools, StringTools } from '../../../../support/utils';

const code = CodeTools(4);
const todayDate = DateTools.getCurrentDate();
const recordType = Lists.recordTypes.orderInvoiceAnalysis;
const currentYear = new Date().getFullYear();
const testData = {
  user: {},
  vendor: NewOrganization.getDefaultOrganization({ isVendor: true }),
  ledger: {},
  fund: {},
  budget: {},
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
  order1: {},
  order2: {},
  order3: {},
  order4: {},
  order5: {},
  pol1: {},
  pol2: {},
  pol3: {},
  pol4: {},
  pol5a: {},
  pol5b: {},
  invoice1: {},
  invoice2: {},
  invoice3: {},
  invoice4: {},
  invoice5: {},
  listName: getTestEntityValue('C805779_List'),
};

const columnsToSelect = [
  ORDER_INVOICE_ANALYSIS_FIELDS.PO.ORDER_TYPE,
  ORDER_INVOICE_ANALYSIS_FIELDS.PO.PO_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE.PO_LINE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.CODE,
  ORDER_INVOICE_ANALYSIS_FIELDS.PO.RELATED_FISCAL_YEARS,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.STATUS,
];

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Invoice Order Analytics', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        OrderLinesLimit.setPOLLimitViaApi(2);
        cy.wait(2000); // Wait for POL limit to be applied before creating orders
        Organizations.createOrganizationViaApi(testData.vendor).then((id) => {
          testData.vendor.id = id;
        });

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

        // Create FY#1 (current year — becomes "last year" after rollover + date swap)
        FiscalYears.createViaApi(testData.fiscalYear1).then((fy1) => {
          testData.fiscalYear1 = fy1;

          // Create Ledger linked to FY#1
          const ledger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: fy1.id,
            restrictExpenditures: false,
            restrictEncumbrance: false,
          };
          Ledgers.createViaApi(ledger).then((createdLedger) => {
            testData.ledger = createdLedger;

            // Create Fund A
            const fund = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fund).then((fundResp) => {
              testData.fund = fundResp.fund;

              // Create Fund A budget ($1000 allocation in FY#1)
              const budget = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy1.id,
                fundId: fundResp.fund.id,
                allocated: 100,
              };
              Budgets.createViaApi(budget).then((budgetResp) => {
                testData.budget = budgetResp;
              });
            });
          });
        });

        // Create FY#2 (next year — becomes "current year" after date swap)
        FiscalYears.createViaApi(testData.fiscalYear2).then((fy2) => {
          testData.fiscalYear2 = fy2;
        });

        // Once all data is ready, create orders and invoices
        cy.then(() => {
          // Helper to create an ongoing order with 1 POL and open it
          const createOngoingOrderWithPol = ({ listUnitPrice = 10 } = {}) => {
            const order = {
              ...NewOrder.defaultOngoingTimeOrder,
              id: uuid(),
              vendor: testData.vendor.id,
              reEncumber: false,
            };
            return Orders.createOrderViaApi(order).then((ord) => {
              const pol = BasicOrderLine.getDefaultOrderLine({
                purchaseOrderId: ord.id,
                fundDistribution: [
                  {
                    code: testData.fund.code,
                    fundId: testData.fund.id,
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

          // ── Order #1 (Ongoing, 1 POL, re-encumber=disabled) ──────────────────
          createOngoingOrderWithPol({ listUnitPrice: 10 }).then(
            ({ order: ord1, pol: pol1Resp }) => {
              testData.order1 = ord1;
              testData.pol1 = pol1Resp;

              // Invoice #1 from Order #1 → Paid (FY#1)
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendor.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendor.erpCode,
                poLineId: pol1Resp.id,
                fundDistributions: pol1Resp.fundDistribution,
                subTotal: 10,
              }).then((inv1) => {
                testData.invoice1 = inv1;
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv1,
                  status: INVOICE_STATUSES.PAID,
                });
              });
            },
          );

          // ── Order #2 (Ongoing, 1 POL, re-encumber=disabled) — no invoice ─────
          createOngoingOrderWithPol({ listUnitPrice: 10 }).then(
            ({ order: ord2, pol: pol2Resp }) => {
              testData.order2 = ord2;
              testData.pol2 = pol2Resp;
            },
          );

          // ── Order #3 (Ongoing, 1 POL, re-encumber=disabled) ──────────────────
          createOngoingOrderWithPol({ listUnitPrice: 10 }).then(
            ({ order: ord3, pol: pol3Resp }) => {
              testData.order3 = ord3;
              testData.pol3 = pol3Resp;

              // Invoice #2 from Order #3 → Paid (FY#1)
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendor.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendor.erpCode,
                poLineId: pol3Resp.id,
                fundDistributions: pol3Resp.fundDistribution,
                subTotal: 10,
              }).then((inv2) => {
                testData.invoice2 = inv2;
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv2,
                  status: INVOICE_STATUSES.PAID,
                });
              });
            },
          );
          // ── Rollover: FY#1 → FY#2 (after Orders #1-3 and Invoices #1-2 are ready) ──
          cy.then(() => {
            const rollover = LedgerRollovers.generateLedgerRollover({
              ledger: testData.ledger,
              fromFiscalYear: testData.fiscalYear1,
              toFiscalYear: testData.fiscalYear2,
              budgetsRollover: [
                {
                  rolloverAllocation: true,
                  rolloverBudgetValue: LEDGER_ROLLOVER_BUDGET_VALUE.NONE,
                  addAvailableTo: ROLLOVER_BUDGET_VALUE_AS.TRANSFER,
                },
              ],
              encumbrancesRollover: [],
              needCloseBudgets: true,
            });
            LedgerRollovers.createLedgerRolloverViaApi(rollover);

            cy.then(() => {
              FiscalYears.getViaApi({ query: `id=="${testData.fiscalYear2.id}"` }).then(
                ({ fiscalYears }) => {
                  FiscalYears.updateFiscalYearViaApi({
                    ...fiscalYears[0],
                    periodStart: `${currentYear}-01-01T00:00:00.000Z`,
                  });
                },
              );
            }).then(() => {
              // ── Post-rollover: Invoice #3 from Order #3 → Approved (FY#1, approved after rollover) ───────
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendor.id,
                fiscalYearId: testData.fiscalYear2.id,
                accountingCode: testData.vendor.erpCode,
                poLineId: testData.pol3.id,
                fundDistributions: testData.pol3.fundDistribution,
                subTotal: 10,
              }).then((inv3) => {
                testData.invoice3 = inv3;
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv3,
                  status: INVOICE_STATUSES.APPROVED,
                });
              });

              // ── Order #4 (Ongoing, 1 POL, re-encumber=disabled) ──────────────────
              const order4 = {
                ...NewOrder.defaultOngoingTimeOrder,
                id: uuid(),
                vendor: testData.vendor.id,
                reEncumber: false,
              };
              Orders.createOrderViaApi(order4).then((ord4) => {
                testData.order4 = ord4;
                const pol4 = BasicOrderLine.getDefaultOrderLine({
                  purchaseOrderId: ord4.id,
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      distributionType: 'percentage',
                      value: 100,
                    },
                  ],
                  specialLocationId: testData.locationId,
                  specialMaterialTypeId: testData.materialTypeId,
                  acquisitionMethod: testData.acquisitionMethodId,
                  listUnitPrice: 10,
                  poLineEstimatedPrice: 10,
                });
                OrderLines.createOrderLineViaApi(pol4).then((pol4Resp) => {
                  testData.pol4 = pol4Resp;
                  Orders.updateOrderViaApi({ ...ord4, workflowStatus: ORDER_STATUSES.OPEN }).then(
                    () => {
                      // Invoice #4 from Order #4 → Open (FY#2 — leave at Open status)
                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: testData.vendor.id,
                        fiscalYearId: testData.fiscalYear2.id,
                        accountingCode: testData.vendor.erpCode,
                        poLineId: pol4Resp.id,
                        fundDistributions: pol4Resp.fundDistribution,
                        subTotal: 10,
                      }).then((inv4) => {
                        testData.invoice4 = inv4;
                        // Leave Invoice #4 in Open status
                      });
                    },
                  );
                });
              });

              // ── Order #5 (Ongoing, 2 POLs, re-encumber=disabled) ─────────────────
              const order5 = {
                ...NewOrder.defaultOngoingTimeOrder,
                id: uuid(),
                vendor: testData.vendor.id,
                reEncumber: false,
              };
              Orders.createOrderViaApi(order5).then((ord5) => {
                testData.order5 = ord5;
                const pol5a = BasicOrderLine.getDefaultOrderLine({
                  purchaseOrderId: ord5.id,
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      distributionType: 'percentage',
                      value: 100,
                    },
                  ],
                  specialLocationId: testData.locationId,
                  specialMaterialTypeId: testData.materialTypeId,
                  acquisitionMethod: testData.acquisitionMethodId,
                  listUnitPrice: 10,
                  poLineEstimatedPrice: 10,
                });
                const pol5b = BasicOrderLine.getDefaultOrderLine({
                  purchaseOrderId: ord5.id,
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      distributionType: 'percentage',
                      value: 100,
                    },
                  ],
                  specialLocationId: testData.locationId,
                  specialMaterialTypeId: testData.materialTypeId,
                  acquisitionMethod: testData.acquisitionMethodId,
                  listUnitPrice: 10,
                  poLineEstimatedPrice: 10,
                });
                OrderLines.createOrderLineViaApi(pol5a).then((pol5aResp) => {
                  testData.pol5a = pol5aResp;
                });
                OrderLines.createOrderLineViaApi(pol5b).then((pol5bResp) => {
                  testData.pol5b = pol5bResp;
                });
                Orders.updateOrderViaApi({ ...ord5, workflowStatus: ORDER_STATUSES.OPEN }).then(
                  () => {
                    cy.then(() => {
                      // Invoice #5 from POL #1 of Order #5 → Paid (FY#2)
                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: testData.vendor.id,
                        fiscalYearId: testData.fiscalYear2.id,
                        accountingCode: testData.vendor.erpCode,
                        poLineId: testData.pol5a.id,
                        fundDistributions: testData.pol5a.fundDistribution,
                        subTotal: 10,
                      }).then((inv5) => {
                        testData.invoice5 = inv5;
                        Invoices.changeInvoiceStatusViaApi({
                          invoice: inv5,
                          status: INVOICE_STATUSES.PAID,
                        });
                      });
                    });
                  },
                );
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

        // Delete invoices
        [
          testData.invoice1,
          testData.invoice2,
          testData.invoice3,
          testData.invoice4,
          testData.invoice5,
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
        ].forEach((ord) => {
          if (ord?.id) Orders.deleteOrderViaApi(ord.id, false);
        });

        Organizations.deleteOrganizationViaApi(testData.vendor.id);

        // Delete finance: budget → fund → ledger → fiscal years
        if (testData.budget?.id) Budgets.deleteViaApi(testData.budget.id, false);
        if (testData.fund?.id) Funds.deleteFundViaApi(testData.fund.id, false);
        if (testData.ledger?.id) Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
        if (testData.fiscalYear1?.id) {
          FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear1.id, false);
        }
        if (testData.fiscalYear2?.id) {
          FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear2.id, false);
        }
      });

      it(
        'C805779 Order - Invoice Analytics: Provide a list of ongoing orders that do not have associated invoices in the current FY (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C805779', 'nonParallel'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Create new list, select "Order — Invoice Analysis" record type, click Build query
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Select "PO — Order type" = Ongoing
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.PO.ORDER_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(ORDER_TYPES.ONGOING);
          QueryModal.verifyQueryAreaContent(`(po.order_type == ${ORDER_TYPES.ONGOING})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 3: Add row — "PO — Related fiscal years" not in "current FY"
          QueryModal.addNewRow();
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.PO.RELATED_FISCAL_YEARS, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.fiscalYear2.name, 1);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);

          // Step 4: Narrow to orders created today for isolation, then test query
          QueryModal.addNewRow(1);
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.PO.CREATED_AT, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.fillInValueTextfield(todayDate, 2);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          // At least Orders #1 and #2 should appear; Orders #3, #4, #5 should not
          QueryModal.verifyResultFound(testData.order1.poNumber);
          QueryModal.verifyResultFound(testData.order2.poNumber);
          QueryModal.verifyResultFound(testData.order3.poNumber, { isFound: false });
          QueryModal.verifyResultFound(testData.order4.poNumber, { isFound: false });
          QueryModal.verifyResultFound(testData.order5.poNumber, { isFound: false });

          // Step 5: Show columns → uncheck all → check expected columns
          QueryModal.clickShowColumnsButton();
          QueryModal.uncheckAllShowColumns();
          columnsToSelect.forEach((col) => QueryModal.selectCheckboxInShowColumns(col));
          columnsToSelect.forEach((col) => QueryModal.verifyColumnDisplayed(col));

          // Row for Order #1: Ongoing | order1.poNumber | pol1.poLineNumber | fy1.code | fy1.code | Paid
          // (Invoice #1 was paid in FY#1; FY#1 is the related FY visible in this query)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.order1.poNumber}\n${testData.pol1.poLineNumber}\n${testData.fiscalYear1.code}\n${testData.fiscalYear1.name}\n${INVOICE_STATUSES.PAID}`,
          );
          // Row for Order #2: Ongoing | order2.poNumber | pol2.poLineNumber (no FY, no invoice — empty cells omitted)
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.order2.poNumber}\n${testData.pol2.poLineNumber}`,
          );
          // Orders #3, #4, #5 must not appear
          QueryModal.verifyResultFound(testData.order3.poNumber, { isFound: false });
          QueryModal.verifyResultFound(testData.order4.poNumber, { isFound: false });
          QueryModal.verifyResultFound(testData.order5.poNumber, { isFound: false });

          // Step 6: Run query & save → view updated list → same columns and rows verified
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);

          columnsToSelect.forEach((col) => QueryModal.verifyColumnDisplayed(col));

          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.order1.poNumber}\n${testData.pol1.poLineNumber}\n${testData.fiscalYear1.code}\n${testData.fiscalYear1.name}\n${INVOICE_STATUSES.PAID}`,
          );
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${ORDER_TYPES.ONGOING}\n${testData.order2.poNumber}\n${testData.pol2.poLineNumber}`,
          );
          QueryModal.verifyResultFound(testData.order3.poNumber, { isFound: false });
          QueryModal.verifyResultFound(testData.order4.poNumber, { isFound: false });
          QueryModal.verifyResultFound(testData.order5.poNumber, { isFound: false });
        },
      );
    });
  });
});
