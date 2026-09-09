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
} from '../../../../support/fragments/bulk-edit/query-modal';
import { ORDER_INVOICE_ANALYSIS_FIELDS } from '../../../../support/constants/query-builder/orderInvoiceAnalysisFields';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
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
  order: {},
  pol: {},
  invoice: {},
  invLine: {},
  listName: getTestEntityValue('C1464110_List'),
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Invoice Order Analytics', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();

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
                allocated: 500,
              };
              Budgets.createViaApi(budget).then((budgetResp) => {
                testData.budget = budgetResp;
              });
            });
          });
        });

        cy.then(() => {
          const order = {
            ...NewOrder.defaultOngoingTimeOrder,
            id: uuid(),
            vendor: testData.vendor.id,
          };
          Orders.createOrderViaApi(order).then((ord) => {
            testData.order = ord;

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
              listUnitPrice: 10,
              poLineEstimatedPrice: 10,
            });
            OrderLines.createOrderLineViaApi(pol).then((polResp) => {
              testData.pol = polResp;

              Orders.updateOrderViaApi({ ...ord, workflowStatus: ORDER_STATUSES.OPEN }).then(() => {
                Invoices.createInvoiceWithInvoiceLineViaApi({
                  vendorId: testData.vendor.id,
                  fiscalYearId: testData.fiscalYear.id,
                  accountingCode: testData.vendor.erpCode,
                  poLineId: polResp.id,
                  fundDistributions: polResp.fundDistribution,
                  subTotal: 10,
                }).then((inv) => {
                  testData.invoice = inv;

                  Invoices.changeInvoiceStatusViaApi({
                    invoice: inv,
                    status: INVOICE_STATUSES.APPROVED,
                  });
                  Invoices.changeInvoiceStatusViaApi({
                    invoice: inv,
                    status: INVOICE_STATUSES.PAID,
                  });

                  cy.then(() => {
                    InvoiceLineDetails.getInvoiceLinesViaApi({
                      query: `invoiceId=="${inv.id}"`,
                      limit: 1,
                    }).then(({ invoiceLines }) => {
                      testData.invLine = invoiceLines[0];
                    });
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
          Permissions.uiFinanceViewLedger.gui,
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
        Lists.deleteListByNameViaApi(testData.listName);
        Users.deleteViaApi(testData.user.userId);
        if (testData.invoice?.id) {
          Invoices.deleteInvoiceViaApi(testData.invoice.id, { failOnStatusCode: false });
        }
        if (testData.order?.id) Orders.deleteOrderViaApi(testData.order.id, false);
        Organizations.deleteOrganizationViaApi(testData.vendor.id);
        if (testData.budget?.id) Budgets.deleteViaApi(testData.budget.id, false);
        if (testData.fund?.id) Funds.deleteFundViaApi(testData.fund.id, false);
        if (testData.ledger?.id) Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
        if (testData.fiscalYear?.id) {
          FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id, false);
        }
      });

      it(
        'C1464110 Verify that the Orders with "PO — Related fiscal years" is queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1464110'] },
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

          // Step 3: Select "PO — Related fiscal years" equals fiscal year, test query
          QueryModal.selectField(ORDER_INVOICE_ANALYSIS_FIELDS.PO.RELATED_FISCAL_YEARS);
          QueryModal.verifyOperatorsList(STRING_STORES_UUID_OPERATORS);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(testData.fiscalYear.name);
          QueryModal.verifyQueryAreaContent(`(all_fiscal_years == ${testData.fiscalYear.name})`);
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.testQuery();
          QueryModal.waitForQueryTestToFinish();

          // Step 4: Check preview of found records
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(false);
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns(
            ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE.PO_LINE_NUMBER,
          );
          QueryModal.clickShowColumnsButton();
          QueryModal.verifyMatchedRecordsByIdentifier(
            testData.pol.poLineNumber,
            ORDER_INVOICE_ANALYSIS_FIELDS.PO.RELATED_FISCAL_YEARS,
            testData.fiscalYear.name,
          );

          // Step 5: Click "Run query & save"
          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(testData.listName);

            // Step 6: Verify refresh complete with matching record count
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 7: Click "View updated list"
            Lists.viewUpdatedList();

            // Step 8: Open Actions, check "PO — Related fiscal years" column; verify value
            Lists.verifyResultCellByIdentifier(
              testData.pol.poLineNumber,
              ORDER_INVOICE_ANALYSIS_FIELDS.PO.RELATED_FISCAL_YEARS,
              testData.fiscalYear.name,
            );
          });
        },
      );
    });
  });
});
