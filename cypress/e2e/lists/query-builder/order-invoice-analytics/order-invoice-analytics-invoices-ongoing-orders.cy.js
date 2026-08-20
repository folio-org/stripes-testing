import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  ORDER_TYPES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import { Budgets, FiscalYears, Ledgers } from '../../../../support/fragments/finance';
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
import OrderLinesLimit from '../../../../support/fragments/settings/orders/orderLinesLimit';
import SelectOrganizationModal from '../../../../support/fragments/orders/modals/selectOrganizationModal';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';

const recordType = Lists.recordTypes.orderInvoiceAnalysis;

const testData = {
  user: {},
  vendor: NewOrganization.getDefaultOrganization({ isVendor: true }),
  ledger: {},
  fund: {},
  budget: {},
  fiscalYear: {
    ...FiscalYears.getDefaultFiscalYear(),
    ...DateTools.getFullFiscalYearStartAndEnd(0),
  },
  order1: {},
  order2: {},
  pol1: {},
  pol2: {},
  polOrd2: {},
  invoice1: {},
  invoice2: {},
  invLine1: {},
  invLine2: {},
  invLineInv2: {},
  listName: getTestEntityValue('C736714_List'),
};

const columnsToSelect = [
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE.FOLIO_INVOICE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.INVOICE_LINE_NUMBER,
  ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE.TOTAL,
  ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE.TITLE_OR_PACKAGE,
];

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Invoice Order Analytics', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        OrderLinesLimit.setPOLLimitViaApi(2);

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

        FiscalYears.createViaApi(testData.fiscalYear).then((fy) => {
          testData.fiscalYear = fy;

          const ledger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: fy.id,
            restrictExpenditures: false,
            restrictEncumbrance: false,
          };
          Ledgers.createViaApi(ledger).then((createdLedger) => {
            testData.ledger = createdLedger;

            const fund = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fund).then((fundResp) => {
              testData.fund = fundResp.fund;

              const budget = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy.id,
                fundId: fundResp.fund.id,
                allocated: 1000,
              };
              Budgets.createViaApi(budget).then((budgetResp) => {
                testData.budget = budgetResp;
              });
            });
          });
        });

        cy.then(() => {
          // ── Ongoing Order #1 with 2 POLs ──────────────────────────────────────
          const order1 = {
            ...NewOrder.defaultOngoingTimeOrder,
            id: uuid(),
            vendor: testData.vendor.id,
          };
          Orders.createOrderViaApi(order1).then((ord1) => {
            testData.order1 = ord1;

            const pol1 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord1.id,
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
              listUnitPrice: 20,
              poLineEstimatedPrice: 20,
            });
            OrderLines.createOrderLineViaApi(pol1).then((pol1Resp) => {
              testData.pol1 = pol1Resp;
            });

            const pol2 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord1.id,
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
              listUnitPrice: 15,
              poLineEstimatedPrice: 15,
            });
            OrderLines.createOrderLineViaApi(pol2).then((pol2Resp) => {
              testData.pol2 = pol2Resp;
            });

            Orders.updateOrderViaApi({ ...ord1, workflowStatus: ORDER_STATUSES.OPEN });
          });

          // ── One-time Order #2 with 1 POL ──────────────────────────────────────
          const order2 = {
            ...NewOrder.defaultOneTimeOrderAPI,
            id: uuid(),
            vendor: testData.vendor.id,
            orderType: ORDER_TYPES.ONE_TIME_API,
          };
          Orders.createOrderViaApi(order2).then((ord2) => {
            testData.order2 = ord2;

            const polOrd2 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord2.id,
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
            OrderLines.createOrderLineViaApi(polOrd2).then((polOrd2Resp) => {
              testData.polOrd2 = polOrd2Resp;
            });

            Orders.updateOrderViaApi({ ...ord2, workflowStatus: ORDER_STATUSES.OPEN });
          });

          // ── Invoices (created after orders/POLs are ready) ────────────────────
          cy.then(() => {
            // Invoice #1: 4 lines (2 from Ongoing POLs, 1 from One-time POL, 1 blank)
            Invoices.createInvoiceViaApi({
              vendorId: testData.vendor.id,
              fiscalYearId: testData.fiscalYear.id,
              accountingCode: testData.vendor.erpCode,
            }).then((inv1) => {
              testData.invoice1 = inv1;

              // Line #1: POL #1 from Ongoing Order #1 — expected in results
              Invoices.createInvoiceLineViaApi(
                Invoices.getDefaultInvoiceLine({
                  invoiceId: inv1.id,
                  invoiceLineStatus: inv1.status,
                  poLineId: testData.pol1.id,
                  subTotal: 20,
                  accountingCode: testData.vendor.erpCode,
                  fundDistributions: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      distributionType: 'percentage',
                      value: 100,
                    },
                  ],
                }),
              ).then((line1) => {
                testData.invLine1 = line1;
              });

              // Line #2: POL #2 from Ongoing Order #1 — expected in results
              Invoices.createInvoiceLineViaApi(
                Invoices.getDefaultInvoiceLine({
                  invoiceId: inv1.id,
                  invoiceLineStatus: inv1.status,
                  poLineId: testData.pol2.id,
                  subTotal: 15,
                  accountingCode: testData.vendor.erpCode,
                  fundDistributions: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      distributionType: 'percentage',
                      value: 100,
                    },
                  ],
                }),
              ).then((line2) => {
                testData.invLine2 = line2;
              });

              // Line #3: POL from One-time Order #2 — NOT expected in results
              Invoices.createInvoiceLineViaApi(
                Invoices.getDefaultInvoiceLine({
                  invoiceId: inv1.id,
                  invoiceLineStatus: inv1.status,
                  poLineId: testData.polOrd2.id,
                  subTotal: 10,
                  accountingCode: testData.vendor.erpCode,
                  fundDistributions: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      distributionType: 'percentage',
                      value: 100,
                    },
                  ],
                }),
              );

              // Line #4: blank, no POL — NOT expected in results
              Invoices.createInvoiceLineViaApi(
                Invoices.getDefaultInvoiceLine({
                  invoiceId: inv1.id,
                  invoiceLineStatus: inv1.status,
                  subTotal: 5,
                  accountingCode: testData.vendor.erpCode,
                }),
              );

              // Re-fetch lines to capture invoiceLineNumber and total
              cy.then(() => {
                InvoiceLineDetails.getInvoiceLinesViaApi({
                  query: `invoiceId=="${inv1.id}"`,
                  limit: 10,
                }).then(({ invoiceLines }) => {
                  testData.invLine1 =
                    invoiceLines.find((l) => l.poLineId === testData.pol1.id) || testData.invLine1;
                  testData.invLine2 =
                    invoiceLines.find((l) => l.poLineId === testData.pol2.id) || testData.invLine2;
                });
              });
            });

            // Invoice #2: 1 line from POL #1 of Ongoing Order #1 — expected in results
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.vendor.id,
              fiscalYearId: testData.fiscalYear.id,
              accountingCode: testData.vendor.erpCode,
              poLineId: testData.pol1.id,
              fundDistributions: [
                {
                  code: testData.fund.code,
                  fundId: testData.fund.id,
                  distributionType: 'percentage',
                  value: 100,
                },
              ],
              subTotal: 18,
            }).then((inv2) => {
              testData.invoice2 = inv2;
              InvoiceLineDetails.getInvoiceLinesViaApi({
                query: `invoiceId=="${inv2.id}"`,
                limit: 1,
              }).then(({ invoiceLines }) => {
                testData.invLineInv2 = invoiceLines[0];
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

        [testData.invoice1, testData.invoice2].forEach((inv) => {
          if (inv?.id) Invoices.deleteInvoiceViaApi(inv.id, { failOnStatusCode: false });
        });
        [testData.order1, testData.order2].forEach((ord) => {
          if (ord?.id) Orders.deleteOrderViaApi(ord.id, false);
        });
        Organizations.deleteOrganizationViaApi(testData.vendor.id);
        if (testData.budget?.id) Budgets.deleteViaApi(testData.budget.id, false);
        if (testData.fund?.id) Funds.deleteFundViaApi(testData.fund.id, false);
        if (testData.ledger?.id) Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
        if (testData.fiscalYear?.id) {
          FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id, false);
        }
      });

      it(
        'C736714 Order - Invoice Analytics: Provide a list of all invoices and invoice lines associated with ongoing orders (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C736714', 'nonParallel'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Create new list, select record type, click Build query
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 2: Select "PO — Order type" = Ongoing, test query
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.PO.ORDER_TYPE);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(ORDER_TYPES.ONGOING);
          // Narrow to test vendor to isolate results from other environment data
          QueryModal.addNewRow();
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.clickOrganizationLookup(1);
          SelectOrganizationModal.findOrganization(testData.vendor.name);
          QueryModal.verifyQueryAreaContent(
            `(po.order_type == ${ORDER_TYPES.ONGOING}) AND (organization.code == ${testData.vendor.code})`,
          );
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          // Exactly 3 rows: invLine1, invLine2, invLineInv2 (line #3 and #4 absent)
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          // Ongoing order POLs appear; One-time order POL does not
          QueryModal.verifyResultFound(testData.pol1.titleOrPackage);
          QueryModal.verifyResultFound(testData.pol2.titleOrPackage);
          QueryModal.verifyResultFound(testData.polOrd2.titleOrPackage, { isFound: false });

          // Step 3: Show columns → uncheck all → check 4 columns; verify expected rows
          QueryModal.clickShowColumnsButton();
          QueryModal.uncheckAllShowColumns();
          columnsToSelect.forEach((col) => QueryModal.selectCheckboxInShowColumns(col));
          columnsToSelect.forEach((col) => QueryModal.verifyColumnDisplayed(col));
          // Invoice #1 line #1 (Ongoing POL #1) — expected
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine1.invoiceLineNumber}\n${testData.invLine1.total.toString()}\n${testData.pol1.titleOrPackage}`,
          );
          // Invoice #1 line #2 (Ongoing POL #2) — expected
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine2.invoiceLineNumber}\n${testData.invLine2.total.toString()}\n${testData.pol2.titleOrPackage}`,
          );
          // Invoice #2 line #1 (Ongoing POL #1) — expected
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice2.folioInvoiceNo}\n${testData.invLineInv2.invoiceLineNumber}\n${testData.invLineInv2.total.toString()}\n${testData.pol1.titleOrPackage}`,
          );
          // Invoice #1 line #3 (One-time POL) and line #4 (blank) — NOT expected
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.polOrd2.titleOrPackage);

          // Step 4: Run query & save, view updated list; verify same rows
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.waitForCompilingToComplete(3000);
          columnsToSelect.forEach((col) => QueryModal.verifyColumnDisplayed(col));
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine1.invoiceLineNumber}\n${testData.invLine1.total.toString()}\n${testData.pol1.titleOrPackage}`,
          );
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice1.folioInvoiceNo}\n${testData.invLine2.invoiceLineNumber}\n${testData.invLine2.total.toString()}\n${testData.pol2.titleOrPackage}`,
          );
          QueryModal.verifyPreviewTableContainsRowWithValuesInOrder(
            `${testData.invoice2.folioInvoiceNo}\n${testData.invLineInv2.invoiceLineNumber}\n${testData.invLineInv2.total.toString()}\n${testData.pol1.titleOrPackage}`,
          );
          QueryModal.verifyResultFound(testData.polOrd2.titleOrPackage, { isFound: false });
          Lists.verifyRecordsNumber(3);
        },
      );
    });
  });
});
