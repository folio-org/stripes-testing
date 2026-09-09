import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
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
import QueryModal, {
  QUERY_OPERATIONS,
  STRING_STORES_UUID_OPERATORS,
  stringStoresUuidButMillionOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { ORDER_INVOICE_ANALYSIS_FIELDS } from '../../../../support/constants/query-builder/orderInvoiceAnalysisFields';
import { Lists } from '../../../../support/fragments/lists/lists';
import SelectOrganizationModal from '../../../../support/fragments/orders/modals/selectOrganizationModal';
import ExpenseClasses from '../../../../support/fragments/settings/finance/expenseClasses';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import OrderLinesLimit from '../../../../support/fragments/settings/orders/orderLinesLimit';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';

const recordType = Lists.recordTypes.orderInvoiceAnalysis;
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
  },
  fiscalYear2: {
    ...FiscalYears.getDefaultFiscalYear(),
    ...DateTools.getFullFiscalYearStartAndEnd(1),
  },
  expenseClass1: ExpenseClasses.getDefaultExpenseClass(),
  expenseClass2: ExpenseClasses.getDefaultExpenseClass(),
  order1: {},
  order2: {},
  pol1Line1: {},
  pol1Line2: {},
  pol2Line1: {},
  pol2Line2: {},
  invoice1: {},
  invoice2: {},
  invLine1: {},
  invLine2: {},
  invLine3: {},
  invLine4: {},
  listName: getTestEntityValue('C1453720_List'),
};

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

        ExpenseClasses.createExpenseClassViaApi(testData.expenseClass1).then((expClass1) => {
          testData.expenseClass1 = expClass1;
        });
        ExpenseClasses.createExpenseClassViaApi(testData.expenseClass2).then((expClass2) => {
          testData.expenseClass2 = expClass2;
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

        FiscalYears.createViaApi(testData.fiscalYear1).then((fy1) => {
          testData.fiscalYear1 = fy1;

          FiscalYears.createViaApi(testData.fiscalYear2).then((fy2) => {
            testData.fiscalYear2 = fy2;
          });

          const ledger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: fy1.id,
            restrictExpenditures: false,
            restrictEncumbrance: false,
          };
          Ledgers.createViaApi(ledger).then((createdLedger) => {
            testData.ledger = createdLedger;

            // Fund A with expense classes Electronic and Print
            const fundA = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fundA).then((fundAResp) => {
              testData.fundA = fundAResp.fund;

              const budgetA = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy1.id,
                fundId: fundAResp.fund.id,
                allocated: 500,
              };
              Budgets.createViaApi(budgetA).then((budgetAResp) => {
                testData.budgetA = budgetAResp;
                cy.then(() => {
                  Budgets.updateBudgetViaApi({
                    ...budgetAResp,
                    statusExpenseClasses: [
                      { status: 'Active', expenseClassId: testData.expenseClass1.id },
                      { status: 'Active', expenseClassId: testData.expenseClass2.id },
                    ],
                  });
                });
              });
            });

            // Fund B without expense class
            const fundB = { ...Funds.getDefaultFund(), ledgerId: createdLedger.id };
            Funds.createViaApi(fundB).then((fundBResp) => {
              testData.fundB = fundBResp.fund;

              const budgetB = {
                ...Budgets.getDefaultBudget(),
                fiscalYearId: fy1.id,
                fundId: fundBResp.fund.id,
                allocated: 500,
              };
              Budgets.createViaApi(budgetB).then((budgetBResp) => {
                testData.budgetB = budgetBResp;
              });
            });
          });
        });

        cy.then(() => {
          // Order #1: Vendor A, 2 POLs — Fund A + ExpClass1 and Fund A + ExpClass2
          const order1 = {
            ...NewOrder.defaultOneTimeOrder,
            id: uuid(),
            vendor: testData.vendorA.id,
          };
          Orders.createOrderViaApi(order1).then((ord1) => {
            testData.order1 = ord1;

            const pol1 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord1.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  expenseClassId: testData.expenseClass1.id,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 20,
              poLineEstimatedPrice: 20,
            });
            OrderLines.createOrderLineViaApi(pol1).then((pol1Resp) => {
              testData.pol1Line1 = pol1Resp;
            });

            const pol2 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord1.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  expenseClassId: testData.expenseClass2.id,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 15,
              poLineEstimatedPrice: 15,
            });
            OrderLines.createOrderLineViaApi(pol2).then((pol2Resp) => {
              testData.pol1Line2 = pol2Resp;
            });

            Orders.updateOrderViaApi({ ...ord1, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendorA.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendorA.erpCode,
                poLineId: testData.pol1Line1.id,
                fundDistributions: testData.pol1Line1.fundDistribution,
                subTotal: 20,
              }).then((inv1) => {
                testData.invoice1 = inv1;

                // Add second invoice line for POL #2
                InvoiceLineDetails.getInvoiceLinesViaApi({
                  query: `invoiceId=="${inv1.id}"`,
                  limit: 1,
                }).then(({ invoiceLines }) => {
                  testData.invLine1 = invoiceLines[0];
                });

                Invoices.createInvoiceLineViaApi(
                  Invoices.getDefaultInvoiceLine({
                    invoiceId: inv1.id,
                    invoiceLineStatus: inv1.status,
                    poLineId: testData.pol1Line2.id,
                    subTotal: 15,
                    accountingCode: testData.vendorA.erpCode,
                    fundDistributions: [
                      {
                        code: testData.fundA.code,
                        fundId: testData.fundA.id,
                        distributionType: 'percentage',
                        value: 100,
                        expenseClassId: testData.expenseClass2.id,
                      },
                    ],
                  }),
                );

                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv1,
                  status: INVOICE_STATUSES.APPROVED,
                });
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv1,
                  status: INVOICE_STATUSES.PAID,
                });

                cy.then(() => {
                  InvoiceLineDetails.getInvoiceLinesViaApi({
                    query: `invoiceId=="${inv1.id}"`,
                    limit: 10,
                  }).then(({ invoiceLines }) => {
                    testData.invLine1 =
                      invoiceLines.find((l) => l.poLineId === testData.pol1Line1.id) ||
                      testData.invLine1;
                    testData.invLine2 =
                      invoiceLines.find((l) => l.poLineId === testData.pol1Line2.id) ||
                      testData.invLine2;
                  });
                });
              });
            });
          });

          // Order #2: Vendor B, 2 POLs — Fund A + ExpClass1 and Fund B (no expense class)
          const order2 = {
            ...NewOrder.defaultOneTimeOrder,
            id: uuid(),
            vendor: testData.vendorB.id,
          };
          Orders.createOrderViaApi(order2).then((ord2) => {
            testData.order2 = ord2;

            const pol3 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord2.id,
              fundDistribution: [
                {
                  code: testData.fundA.code,
                  fundId: testData.fundA.id,
                  distributionType: 'percentage',
                  value: 100,
                  expenseClassId: testData.expenseClass1.id,
                },
              ],
              specialLocationId: testData.locationId,
              specialMaterialTypeId: testData.materialTypeId,
              acquisitionMethod: testData.acquisitionMethodId,
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
            });
            OrderLines.createOrderLineViaApi(pol3).then((pol3Resp) => {
              testData.pol2Line1 = pol3Resp;
            });

            const pol4 = BasicOrderLine.getDefaultOrderLine({
              purchaseOrderId: ord2.id,
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
            OrderLines.createOrderLineViaApi(pol4).then((pol4Resp) => {
              testData.pol2Line2 = pol4Resp;
            });

            Orders.updateOrderViaApi({ ...ord2, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
              Invoices.createInvoiceWithInvoiceLineViaApi({
                vendorId: testData.vendorB.id,
                fiscalYearId: testData.fiscalYear1.id,
                accountingCode: testData.vendorB.erpCode,
                poLineId: testData.pol2Line1.id,
                fundDistributions: testData.pol2Line1.fundDistribution,
                subTotal: 10,
              }).then((inv2) => {
                testData.invoice2 = inv2;

                Invoices.createInvoiceLineViaApi(
                  Invoices.getDefaultInvoiceLine({
                    invoiceId: inv2.id,
                    invoiceLineStatus: inv2.status,
                    poLineId: testData.pol2Line2.id,
                    subTotal: 12,
                    accountingCode: testData.vendorB.erpCode,
                    fundDistributions: [
                      {
                        code: testData.fundB.code,
                        fundId: testData.fundB.id,
                        distributionType: 'percentage',
                        value: 100,
                      },
                    ],
                  }),
                );

                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv2,
                  status: INVOICE_STATUSES.APPROVED,
                });
                Invoices.changeInvoiceStatusViaApi({
                  invoice: inv2,
                  status: INVOICE_STATUSES.PAID,
                });

                cy.then(() => {
                  InvoiceLineDetails.getInvoiceLinesViaApi({
                    query: `invoiceId=="${inv2.id}"`,
                    limit: 10,
                  }).then(({ invoiceLines }) => {
                    testData.invLine3 =
                      invoiceLines.find((l) => l.poLineId === testData.pol2Line1.id) ||
                      testData.invLine3;
                    testData.invLine4 =
                      invoiceLines.find((l) => l.poLineId === testData.pol2Line2.id) ||
                      testData.invLine4;
                  });
                });
              });
            });
          });
        });

        cy.createTempUser([
          Permissions.listsAll.gui,
          Permissions.uiOrganizationsView.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
          Permissions.inventoryAll.gui,
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
        Organizations.deleteOrganizationViaApi(testData.vendorA.id);
        Organizations.deleteOrganizationViaApi(testData.vendorB.id);
        ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClass1.id, {
          failOnStatusCode: false,
        });
        ExpenseClasses.deleteExpenseClassViaApi(testData.expenseClass2.id, {
          failOnStatusCode: false,
        });
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
        'C1453720 User can build and save an "Order — Invoice Analysis" list queried by organization code, fiscal year UUID and expense class UUID (athena)',
        { tags: ['extendedPath', 'athena', 'C1453720', 'nonParallel'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.filtersWaitLoading,
          });

          // Step 1: Create new list with "Order — Invoice Analysis" record type
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(recordType);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click "Build query", verify form opens with correct elements
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Select "Organization — Code" equals vendorA, test query; verify 2 records
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE);
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.clickOrganizationLookup();
          SelectOrganizationModal.findOrganization(testData.vendorA.name);
          QueryModal.verifyQueryAreaContent(`(organization.code == ${testData.vendorA.code})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(
            ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE.PO_LINE_NUMBER,
          );
          QueryModal.clickShowColumnsButton();
          // Invoice #1 lines displayed; Invoice #2 lines (Vendor B) not displayed
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
            testData.vendorA.code,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
            testData.vendorA.code,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.vendorB.code);

          // Step 4: Change operator to "in", add vendorB; verify 4 records
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.clickOrganizationLookup();
          SelectOrganizationModal.filterByOrganizationStatus('Active');
          SelectOrganizationModal.selectOrganizations([testData.vendorB.name], 'Name');
          SelectOrganizationModal.save();
          SelectOrganizationModal.verifyClosed();
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyQueryAreaContent(
            `(organization.code in [${testData.vendorA.code}, ${testData.vendorB.code}])`,
          );

          // Step 5: Verify "Organization — Code" column shows correct vendor per PO line
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
            testData.vendorA.code,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
            testData.vendorA.code,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
            testData.vendorB.code,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
            testData.vendorB.code,
          );

          // Step 6: Change field to "Fiscal year — UUID", equals FY1 UUID; verify 4 records
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID);
          QueryModal.verifySelectedField(ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID);
          QueryModal.verifyOperatorsList(stringStoresUuidButMillionOperators);
          QueryModal.verifySelectedOperator('Select operator');
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.fiscalYear1.id);
          QueryModal.verifyTextFieldValue(testData.fiscalYear1.id);
          QueryModal.verifyQueryAreaContent(`(fiscal_year.id == ${testData.fiscalYear1.id})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );

          // Step 7: Change operator to "in", add FY2 UUID; verify 4 records; FY1 UUID shown for all
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(`${testData.fiscalYear1.id},${testData.fiscalYear2.id}`);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(4);
          QueryModal.verifyQueryAreaContent(
            `(fiscal_year.id in (${testData.fiscalYear1.id}, ${testData.fiscalYear2.id}))`,
          );

          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID,
            testData.fiscalYear1.id,
          );

          // Step 8: Change field to "Expense class — UUID", equals ExpClass1 UUID; verify 2 records
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID);
          QueryModal.verifySelectedField(ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID);
          QueryModal.verifyOperatorsList(stringStoresUuidButMillionOperators);
          QueryModal.verifySelectedOperator('Select operator');
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.expenseClass1.id);
          QueryModal.verifyTextFieldValue(testData.expenseClass1.id);
          QueryModal.verifyQueryAreaContent(`(expense_class.id == ${testData.expenseClass1.id})`);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          // Invoice #1 line 1 (ExpClass1) and Invoice #2 line 1 (ExpClass1) are shown
          QueryModal.verifyNumberOfRowsInPreviewTable(2);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID,
            testData.expenseClass1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID,
            testData.expenseClass1.id,
          );
          // Invoice #1 line 2 (ExpClass2) and Invoice #2 line 2 (no expense class) are NOT shown
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol1Line2.poLineNumber);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol2Line2.poLineNumber);

          // Step 9: Change operator to "in", add ExpClass2 UUID; verify 3 records
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.fillInValueTextfield(
            `${testData.expenseClass1.id},${testData.expenseClass2.id}`,
          );
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(3);
          QueryModal.verifyQueryAreaContent(
            `(expense_class.id in (${testData.expenseClass1.id}, ${testData.expenseClass2.id}))`,
          );
          // Invoice #1 line 1 (Electronic), Invoice #1 line 2 (Print), Invoice #2 line 1 (Electronic) shown; Invoice #2 line 2 absent
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID,
            testData.expenseClass1.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID,
            testData.expenseClass2.id,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID,
            testData.expenseClass1.id,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol2Line2.poLineNumber);

          // Step 10: Change operator to "is null/empty", True; verify 1 record (Invoice #2 line 2)
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('True');

          // Add new row to control the number of returned records
          QueryModal.addNewRow();
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID, 1);
          QueryModal.verifySelectedField(ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.fillInValueTextfield(testData.fiscalYear1.id, 1);

          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          // Invoice #2 line 2 has no expense class (null/empty)
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol2Line2.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID,
            '',
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol1Line1.poLineNumber);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol1Line2.poLineNumber);
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol2Line1.poLineNumber);
          QueryModal.clickGarbage();

          // Step 11: Build 3-condition query: ExpClass1 equals + OrgCode equals vendorA + FY1 UUID equals → 1 record
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.fillInValueTextfield(testData.expenseClass1.id);
          QueryModal.addNewRow();
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.clickOrganizationLookup(1);
          SelectOrganizationModal.findOrganization(testData.vendorA.name);
          QueryModal.addNewRow(1);
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID, 2);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.fillInValueTextfield(testData.fiscalYear1.id, 2);
          QueryModal.verifyPlusAndTrashButtonsDisabled(0, false, false);
          QueryModal.verifyPlusAndTrashButtonsDisabled(1, false, false);
          QueryModal.verifyPlusAndTrashButtonsDisabled(2, false, false);
          QueryModal.testQuery();

          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyQueryAreaContent(
            `(expense_class.id == ${testData.expenseClass1.id}) AND (organization.code == ${testData.vendorA.code}) AND (fiscal_year.id == ${testData.fiscalYear1.id})`,
          );
          // Only Invoice #1, line 1 matches all three conditions
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol1Line1.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE,
            testData.vendorA.code,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(testData.pol2Line1.poLineNumber);

          // Step 12: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(testData.listName);
          Lists.waitForCompilingToComplete(3000);
          Lists.verifyQuery(
            `expense_class.id == ${testData.expenseClass1.id}) AND (organization.code == ${testData.vendorA.code}) AND (fiscal_year.id == ${testData.fiscalYear1.id}`,
          );

          // Step 13: Edit query via Actions → Edit list → Edit query; verify 3 conditions preserved
          Lists.openActions();
          Lists.editList();
          Lists.editQuery();
          QueryModal.verifySelectedField(ORDER_INVOICE_ANALYSIS_FIELDS.EXPENSE_CLASS.UUID, 0);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 0);
          QueryModal.verifyTextFieldValue(testData.expenseClass1.id, 0);
          QueryModal.verifySelectedField(ORDER_INVOICE_ANALYSIS_FIELDS.ORGANIZATION.CODE, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 1);
          QueryModal.verifySelectedField(ORDER_INVOICE_ANALYSIS_FIELDS.FISCAL_YEAR.UUID, 2);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.EQUAL, 2);
          QueryModal.verifyTextFieldValue(testData.fiscalYear1.id, 2);
          QueryModal.verifyQueryAreaContent(
            `(expense_class.id == ${testData.expenseClass1.id}) AND (organization.code == ${testData.vendorA.code}) AND (fiscal_year.id == ${testData.fiscalYear1.id})`,
          );

          // Step 14: Remove rows 0 and 1 (ExpClass and OrgCode), leaving only FY1 UUID row; run query & save
          QueryModal.clickGarbage(0);
          QueryModal.clickGarbage(0);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();
          QueryModal.clickRunQueryAndSave();
          QueryModal.verifyClosed();
          Lists.verifyListSavedCalloutMessage(testData.listName);
          Lists.verifyQuery(`fiscal_year.id == ${testData.fiscalYear1.id}`);
        },
      );
    });
  });
});
