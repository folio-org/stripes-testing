import uuid from 'uuid';

import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  BUDGET_STATUSES,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  FUND_STATUSES,
  INVOICE_STATUSES,
  LEDGER_STATUSES,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../../../support/constants';
import {
  AGREEMENTS_INVOICES_ORDERS_FIELDS,
  ORDER_INVOICE_ANALYSIS_FIELDS,
} from '../../../../support/constants/query-builder/orderInvoiceAnalysisFields';
import { PURCHASE_ORDER_LINES_FIELDS } from '../../../../support/constants/query-builder/purchaseOrderLinesFields';
import { RECEIVING_PIECES_FIELDS } from '../../../../support/constants/query-builder/receivingPiecesFields';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Permissions from '../../../../support/dictionary/permissions';
import AgreementLines from '../../../../support/fragments/agreements/agreementLines';
import Agreements from '../../../../support/fragments/agreements/agreements';
import QueryModal, { QUERY_OPERATIONS } from '../../../../support/fragments/bulk-edit/query-modal';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../../../support/fragments/finance';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { Invoices } from '../../../../support/fragments/invoices';
import { Lists } from '../../../../support/fragments/lists/lists';
import ListsFile from '../../../../support/fragments/lists/lists-file';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../../../support/fragments/orders/basicOrderLine';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import { ExpenseClasses } from '../../../../support/fragments/settings/finance';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, DateTools, ExecutionFlowManager, StringTools } from '../../../../support/utils';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';

const R = {
  ACQUISITION_METHOD: 'acquisitionMethod',
  AGREEMENT: 'agreement',
  AGREEMENT_LINE: 'agreementLine',
  AGREEMENT_ORGANIZATION_ROLE_CATEGORY: 'agreementOrganizationRoleCategory',
  BUDGETS: 'budgets',
  EXPENSE_CLASSES: 'expenseClasses',
  FISCAL_YEARS: 'fiscalYears',
  FUNDS: 'funds',
  INVOICE: 'invoice',
  INVOICE_LINES: 'invoiceLines',
  LEDGER: 'ledger',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ORDERS: 'orders',
  ORDER_LINES: 'orderLines',
  ORGANIZATIONS: 'organizations',
  PACKAGE_INSTANCES: 'packageInstances',
  TAG_ID: 'tagId',
  USER: 'user',
};

const POL_FIELDS = PURCHASE_ORDER_LINES_FIELDS;
const OIA_FIELDS = ORDER_INVOICE_ANALYSIS_FIELDS;
const AGREEMENT_FIELDS = AGREEMENTS_INVOICES_ORDERS_FIELDS;
const AGREEMENT_STATUSES = { ACTIVE: 'active' };
const QUERY_BOOLEAN_VALUES = { TRUE: 'True' };
const AGREEMENT_ORGANIZATION_ROLE_CATEGORY = 'SubscriptionAgreementOrg.Role';
// Include time as well as randomness because failed runs can leave uniquely constrained
// finance records in the shared tenant; four digits alone collide too easily on reruns.
const randomPostfix = StringTools.randomFourDigitNumber();
const postfix = `${Date.now()}_${randomPostfix}`;
const compactPostfix = `${Date.now()}${randomPostfix}`.slice(-9);
const fiscalYearSeries = CodeTools(4);
const currentYear = new Date().getFullYear();
const expenseClassPrefix = `Electronic_${postfix}`;
const isolationTag = `C1404906_${compactPostfix}`;
const downloadedCsvMask = 'AT_C1404906_*.csv';

const listNames = {
  agreementsInvoicesOrders: getTestEntityValue('C1404906_Agreements_Invoices_Orders'),
  orderInvoiceAnalysis: getTestEntityValue('C1404906_Order_Invoice_Analysis'),
  purchaseOrderLines: getTestEntityValue('C1404906_Purchase_Order_Lines'),
  purchaseOrderLinesWithTitles: getTestEntityValue('C1404906_POL_With_Titles'),
  receivingPieces: getTestEntityValue('C1404906_Receiving_Pieces'),
  receivingTitles: getTestEntityValue('C1404906_Receiving_Titles'),
};

const fieldsAvailableFor = (fields) => [
  fields.PO_LINE.MULTI_YEAR_PREPAYMENT,
  fields.PAYMENT_TERMS.DISTRIBUTION_TYPE,
  fields.PAYMENT_TERMS.EXPENSE_CLASS,
  fields.PAYMENT_TERMS.FISCAL_YEAR,
  fields.PAYMENT_TERMS.FUND_CODE,
  fields.PAYMENT_TERMS.FUND,
  fields.PO_LINE.PREPAYMENT_TERM,
  fields.PO_LINE.STARTING_FISCAL_YEAR,
];

const polFieldsAvailable = [
  POL_FIELDS.POL.MULTI_YEAR_PREPAYMENT,
  POL_FIELDS.PAYMENT_TERMS.DISTRIBUTION_TYPE,
  POL_FIELDS.PAYMENT_TERMS.EXPENSE_CLASS,
  POL_FIELDS.PAYMENT_TERMS.FISCAL_YEAR,
  POL_FIELDS.PAYMENT_TERMS.FUND_CODE,
  POL_FIELDS.PAYMENT_TERMS.FUND,
  POL_FIELDS.POL.PREPAYMENT_TERM,
  POL_FIELDS.POL.STARTING_FISCAL_YEAR,
];

const selectedColumnsFor = (fields) => [
  fields.PO_LINE.MULTI_YEAR_PREPAYMENT,
  fields.PO_LINE.PAYMENT_TERMS,
  fields.PO_LINE.PREPAYMENT_TERM,
  fields.PO_LINE.STARTING_FISCAL_YEAR,
];

const selectedPolColumns = [
  POL_FIELDS.POL.MULTI_YEAR_PREPAYMENT,
  POL_FIELDS.POL.PAYMENT_TERMS,
  POL_FIELDS.POL.PREPAYMENT_TERM,
  POL_FIELDS.POL.STARTING_FISCAL_YEAR,
];

// These are the nine capability sets named by C1404906. Assigning them directly in
// Eureka avoids relying on legacy permission-to-capability mappings, which may expose
// a narrower set of FQM record types than the capability set itself.
const requiredCapabilitySets = [
  CapabilitySets.uiAgreementsAgreementsView,
  CapabilitySets.uiFinanceFundBudgetView,
  CapabilitySets.uiInvoiceInvoiceView,
  CapabilitySets.uiInventoryInstanceView,
  CapabilitySets.uiOrdersOrdersView,
  CapabilitySets.uiOrganizationsView,
  CapabilitySets.uiReceivingView,
  CapabilitySets.moduleListsRefreshView,
  CapabilitySets.moduleListsExportView,
];

const legacyPermissions = [
  Permissions.uiAgreementsSearchAndView.gui,
  Permissions.uiFinanceViewFundAndBudget.gui,
  Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui,
  Permissions.uiInventoryViewInstances.gui,
  Permissions.uiOrdersView.gui,
  Permissions.uiOrganizationsView.gui,
  Permissions.uiReceivingView.gui,
  Permissions.listsEdit.gui,
  Permissions.listsExport.gui,
];

const selectValue = (field, operator, value, row = 0) => {
  QueryModal.selectField(field, row);
  QueryModal.selectOperator(operator, row);
  QueryModal.chooseValueSelect(value, row);
};

const enterValue = (field, operator, value, row = 0) => {
  QueryModal.selectField(field, row);
  QueryModal.selectOperator(operator, row);
  QueryModal.fillInValueTextfield(value, row);
};

const addIsolationTagFilter = (field, row, afterRow = row - 1) => {
  QueryModal.addNewRow(afterRow);
  QueryModal.selectField(field, row);
  QueryModal.selectOperator(QUERY_OPERATIONS.IN, row);
  QueryModal.fillInValueMultiselect(isolationTag, row);
};

const testQuery = (expectedRecords) => {
  QueryModal.testQuery();
  QueryModal.waitForQueryTestToFinish();
  QueryModal.verifyNumberOfMatchedRecords(expectedRecords);
  QueryModal.verifyNumberOfRowsInPreviewTable(expectedRecords);
};

const createListAndOpenQuery = (name, recordType, recordTypeKeywords) => {
  Lists.openNewListPane();
  Lists.setName(name);
  if (recordTypeKeywords) {
    Lists.selectRecordTypeByKeywords(recordTypeKeywords[0], recordTypeKeywords);
  } else {
    Lists.selectRecordType(recordType);
  }
  Lists.buildQuery();
  QueryModal.verify();
};

const selectAndVerifyColumns = (columns) => {
  QueryModal.clickShowColumnsButton();
  columns.forEach((column) => QueryModal.selectCheckboxInShowColumnsBySearch(column));
  // Each selection is verified while its filtered checkbox is mounted. The preview
  // grid virtualizes columns according to schema order, so all selected headers are
  // not guaranteed to exist in the DOM at the same horizontal scroll position.
  QueryModal.clickShowColumnsButton();
};

const verifySavedList = (expectedRecords, columns) => {
  Lists.viewUpdatedList();
  if (expectedRecords === 1) {
    Lists.verifySingleRecordNumber();
  } else if (expectedRecords !== null) {
    Lists.verifyRecordsNumber(expectedRecords);
  }
  columns.forEach((column) => Lists.verifyResultColumnDisplayed(column));
};

const exportSelectedColumns = (listName, columns, expectedValues) => {
  FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${listName}.csv`);
  Lists.openActions();
  Lists.exportListVisibleColumns();
  ListsFile.verifyDownloadedCsvContains(listName, { headers: columns, values: expectedValues });
};

const exportAllColumns = (listName, expectedHeaders, expectedValues) => {
  // Both export actions use the list name. Removing the selected-columns file prevents
  // Chrome from suffixing the all-columns download and makes the assertion deterministic.
  FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${listName}.csv`);
  Lists.openActions();
  Lists.exportList();
  ListsFile.verifyDownloadedCsvContains(listName, {
    headers: expectedHeaders,
    values: expectedValues,
  });
  // Keep the downloads directory clean after a successful export assertion. The
  // suite-level cleanup below is the fallback when an assertion fails mid-export.
  FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${listName}.csv`);
};

const saveAndExportList = ({
  listName,
  expectedRecords,
  selectedColumns,
  selectedValues,
  allHeaders,
  allValues,
}) => {
  QueryModal.clickRunQueryAndSave();
  verifySavedList(expectedRecords, selectedColumns);
  exportSelectedColumns(listName, selectedColumns, selectedValues);
  exportAllColumns(listName, allHeaders, allValues);
  Lists.closeListDetailsPane();
};

const fundDistribution = (
  fund,
  value,
  distributionType = FUND_DISTRIBUTION_TYPES.AMOUNT,
  expenseClassId,
) => ({
  code: fund.code,
  distributionType,
  expenseClassId,
  fundId: fund.id,
  value,
});

describe('Lists', () => {
  describe('Query Builder', () => {
    const flow = new ExecutionFlowManager();
    const orderTitles = [1, 2, 3, 4].map(
      (number) => `AT_C1404906_Order_${number}_Title_${postfix}`,
    );
    const packageTitles = [1, 2].map((number) => `AT_C1404906_Package_Title_${number}_${postfix}`);

    before('Create C1404906 preconditions', () => {
      FileManager.deleteFilesFromDownloadsByMask(downloadedCsvMask);
      cy.getAdminToken();
      cy.clearAllLocalStorage();

      flow
        // Test isolation support: tag every PO line so shared-tenant queries return only this run's data.
        .step((currentFlow) => {
          return Organizations.createTagViaApi(isolationTag).then((tagId) => currentFlow.set(R.TAG_ID, tagId, (id) => Organizations.deleteTagByIdViaApi(id)));
        })
        // Supporting data required to create the physical PO lines from Preconditions 4-7.
        .step((currentFlow) => {
          return cy
            .getLocations({ limit: 1 })
            .then((location) => currentFlow.set(R.LOCATION, location));
        })
        .step((currentFlow) => {
          return cy
            .getDefaultMaterialType()
            .then((materialType) => currentFlow.set(R.MATERIAL_TYPE, materialType));
        })
        .step((currentFlow) => {
          return cy
            .getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            })
            .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
        })
        // Precondition 9 support: create the two organizations attached to the Agreement.
        .step((currentFlow) => {
          const organizations = [
            {
              ...NewOrganization.getDefaultOrganization({ isVendor: true }),
              name: `AT_C1404906_Organization_A_${postfix}`,
            },
            {
              ...NewOrganization.getDefaultOrganization({ isVendor: true }),
              name: `AT_C1404906_Organization_B_${postfix}`,
            },
          ];

          return cy
            .wrap(organizations)
            .each((organization) => Organizations.createOrganizationViaApi(organization).then((id) => {
              organization.id = id;
            }))
            .then(() => currentFlow.set(R.ORGANIZATIONS, organizations, (entities) => entities.forEach(({ id }) => Organizations.deleteOrganizationViaApi(id))));
        })
        // Precondition 1: create the current and two future fiscal years with one shared series;
        // the first fiscal year's period includes today.
        .step((currentFlow) => {
          const fiscalYears = [0, 1, 2].map((yearOffset) => ({
            ...FiscalYears.getDefaultFiscalYear(),
            ...DateTools.getFullFiscalYearStartAndEnd(yearOffset),
            code: `${fiscalYearSeries}${currentYear + yearOffset}`,
            name: `AT_C1404906_Fiscal_Year_${currentYear + yearOffset}_${postfix}`,
            series: fiscalYearSeries,
          }));

          return cy
            .wrap(fiscalYears)
            .each((fiscalYear) => FiscalYears.createViaApi(fiscalYear).then((createdFiscalYear) => Object.assign(fiscalYear, createdFiscalYear)))
            .then(() => currentFlow.set(R.FISCAL_YEARS, fiscalYears, (entities) => entities.forEach(({ id }) => FiscalYears.deleteFiscalYearViaApi(id, false))));
        })
        // Precondition 2: create an active Ledger linked to the current fiscal year.
        .step((currentFlow) => {
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: currentFlow.get(R.FISCAL_YEARS)[0].id,
            ledgerStatus: LEDGER_STATUSES.ACTIVE,
            name: `AT_C1404906_Ledger_${postfix}`,
          }).then((ledger) => currentFlow.set(R.LEDGER, ledger, ({ id }) => Ledgers.deleteLedgerViaApi(id, false)));
        })
        // Precondition 3 support: create the Electronic and Print expense classes that
        // will be enabled on every current and planned Fund A budget.
        .step((currentFlow) => {
          const expenseClasses = [
            {
              ...ExpenseClasses.getDefaultExpenseClass(),
              code: `E${compactPostfix}`,
              name: `${expenseClassPrefix}_Expense_Class`,
            },
            {
              ...ExpenseClasses.getDefaultExpenseClass(),
              code: `P${compactPostfix}`,
              name: `Print_${postfix}_Expense_Class`,
            },
          ];

          return cy
            .wrap(expenseClasses)
            .each((expenseClass) => ExpenseClasses.createExpenseClassViaApi(expenseClass).then((createdExpenseClass) => Object.assign(expenseClass, createdExpenseClass)))
            .then(() => currentFlow.set(R.EXPENSE_CLASSES, expenseClasses, (entities) => entities.forEach(({ id }) => ExpenseClasses.deleteExpenseClassViaApi(id, { failOnStatusCode: false }))));
        })
        // Precondition 3: create active Fund A and Fund B under the active Ledger.
        .step((currentFlow) => {
          const funds = ['A', 'B'].map((suffix) => ({
            ...Funds.getDefaultFund(),
            code: `${suffix}${compactPostfix}`,
            fundStatus: FUND_STATUSES.ACTIVE,
            ledgerId: currentFlow.get(R.LEDGER).id,
            name: `AT_C1404906_Fund_${suffix}_${postfix}`,
          }));

          return cy
            .wrap(funds)
            .each((fund, index) => Funds.createViaApi(fund).then((response) => {
              funds[index] = response.fund || response;
            }))
            .then(() => currentFlow.set(R.FUNDS, funds, (entities) => entities.forEach(({ id }) => Funds.deleteFundViaApi(id, false))));
        })
        // Precondition 3: give both funds a $1000 current budget and two $1000 planned
        // budgets; enable both expense classes on every Fund A budget.
        .step((currentFlow) => {
          const budgets = [];
          const [expenseClass1, expenseClass2] = currentFlow.get(R.EXPENSE_CLASSES);

          return cy
            .wrap(currentFlow.get(R.FISCAL_YEARS))
            .each((fiscalYear, fiscalYearIndex) => cy.wrap(currentFlow.get(R.FUNDS)).each((fund, fundIndex) => Budgets.createViaApi({
              ...Budgets.getDefaultBudget(),
              allocated: 1000,
              budgetStatus:
                    fiscalYearIndex === 0 ? BUDGET_STATUSES.ACTIVE : BUDGET_STATUSES.PLANNED,
              fiscalYearId: fiscalYear.id,
              fundId: fund.id,
              statusExpenseClasses:
                    fundIndex === 0
                      ? [expenseClass1, expenseClass2].map(({ id }) => ({
                        expenseClassId: id,
                        status: EXPENSE_CLASS_STATUSES.ACTIVE,
                      }))
                      : [],
            }).then((budget) => budgets.push(budget))))
            .then(() => currentFlow.set(R.BUDGETS, budgets, (entities) => entities.forEach(({ id }) => Budgets.deleteViaApi(id, false))));
        })
        // Precondition 9 support: the snapshot tenant normally contains only one
        // Agreement organization role. Preserve the original pick list and add a
        // temporary second role so the Agreement can use two genuinely different roles.
        .step((currentFlow) => {
          return cy
            .okapiRequest({
              path: 'erm/refdata',
              searchParams: { filters: `desc=${AGREEMENT_ORGANIZATION_ROLE_CATEGORY}` },
              isDefaultSearchParamsRequired: false,
            })
            .then(({ body }) => {
              const categories = Array.isArray(body) ? body : body.results || [];
              const category = categories.find(
                ({ desc }) => desc === AGREEMENT_ORGANIZATION_ROLE_CATEGORY,
              );

              const originalCategory = Cypress._.cloneDeep(category);

              if (category.values.length > 1) {
                return currentFlow.set(R.AGREEMENT_ORGANIZATION_ROLE_CATEGORY, category);
              }

              return cy
                .okapiRequest({
                  method: 'PUT',
                  path: `erm/refdata/${category.id}`,
                  body: {
                    ...category,
                    values: [
                      ...category.values,
                      { label: `AT C1404906 second organization role ${postfix}` },
                    ],
                  },
                  isDefaultSearchParamsRequired: false,
                })
                .then(({ body: updatedCategory }) => currentFlow.set(R.AGREEMENT_ORGANIZATION_ROLE_CATEGORY, updatedCategory, () => cy.okapiRequest({
                  method: 'PUT',
                  path: `erm/refdata/${originalCategory.id}`,
                  body: originalCategory,
                  isDefaultSearchParamsRequired: false,
                  failOnStatusCode: false,
                })));
            });
        })
        // Precondition 9: create an active Agreement starting today and attach two
        // organizations using the tenant's first and second organization roles.
        .step((currentFlow) => {
          const [organizationA, organizationB] = currentFlow.get(R.ORGANIZATIONS);
          const [firstRole, secondRole] = currentFlow.get(
            R.AGREEMENT_ORGANIZATION_ROLE_CATEGORY,
          ).values;

          return Agreements.createViaApi({
            ...Agreements.defaultAgreement,
            agreementStatus: AGREEMENT_STATUSES.ACTIVE,
            name: `AT_C1404906_Agreement_${postfix}`,
            periods: [{ startDate: DateTools.getCurrentDateForFiscalYear() }],
            orgs: [
              {
                org: { name: organizationA.name, orgsUuid: organizationA.id },
                roles: [{ role: firstRole }],
              },
              {
                org: { name: organizationB.name, orgsUuid: organizationB.id },
                roles: [{ role: secondRole }],
              },
            ],
          }).then((agreement) => currentFlow.set(R.AGREEMENT, agreement, ({ id }) => Agreements.deleteViaApi(id)));
        })
        // Precondition 6 support: create the two inventory instances added as titles
        // to the active package PO line from Order #3.
        .step((currentFlow) => {
          const packageInstances = [];
          return cy
            .wrap(packageTitles)
            .each((instanceTitle) => InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => packageInstances.push(instanceData)))
            .then(() => currentFlow.set(R.PACKAGE_INSTANCES, packageInstances, (entities) => entities.forEach(({ instanceId }) => InventoryInstance.deleteInstanceViaApi(instanceId))));
        })
        // Preconditions 4-7: create four ongoing orders and their PO lines with the
        // exact multi-year, pricing, fund-distribution, and inventory settings below.
        .step((currentFlow) => {
          const orders = [];
          const orderLines = [];
          const fiscalYears = currentFlow.get(R.FISCAL_YEARS);
          const [fundA, fundB] = currentFlow.get(R.FUNDS);
          const [expenseClass1, expenseClass2] = currentFlow.get(R.EXPENSE_CLASSES);
          const organizationA = currentFlow.get(R.ORGANIZATIONS)[0];
          // Preconditions 4-6 share a synchronized receiving workflow and create an
          // instance, holding, and item for each physical quantity.
          const baseLine = (index, quantity, estimatedPrice) => ({
            ...BasicOrderLine.getDefaultOrderLine({
              acquisitionMethod: currentFlow.get(R.ACQUISITION_METHOD).id,
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              listUnitPrice: estimatedPrice / quantity,
              poLineEstimatedPrice: estimatedPrice,
              quantity,
              specialLocationId: currentFlow.get(R.LOCATION).id,
              specialMaterialTypeId: currentFlow.get(R.MATERIAL_TYPE).id,
              title: orderTitles[index],
            }),
            checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
            id: uuid(),
            tags: { tagList: [isolationTag] },
          });
          const lineData = [
            // Precondition 4 — Order #1: quantity 2, $200 estimated price, multi-year
            // payment enabled, a three-year schedule, and an empty third-year card.
            {
              ...baseLine(0, 2, 200),
              agreementId: currentFlow.get(R.AGREEMENT).id,
              fundDistribution: [
                fundDistribution(fundA, 100, FUND_DISTRIBUTION_TYPES.AMOUNT, expenseClass1.id),
                fundDistribution(fundB, 100),
              ],
              multiYearPayment: true,
              paymentTerms: {
                totalPrice: 300,
                prepaymentTerm: 3,
                startingFiscalYearId: fiscalYears[0].id,
                fiscalYearDistributions: [
                  {
                    fiscalYearId: fiscalYears[0].id,
                    fundDistributions: [
                      fundDistribution(fundA, 75, FUND_DISTRIBUTION_TYPES.AMOUNT, expenseClass1.id),
                      fundDistribution(fundB, 75),
                    ],
                  },
                  {
                    fiscalYearId: fiscalYears[1].id,
                    fundDistributions: [
                      fundDistribution(
                        fundA,
                        150,
                        FUND_DISTRIBUTION_TYPES.AMOUNT,
                        expenseClass2.id,
                      ),
                    ],
                  },
                  { fiscalYearId: fiscalYears[2].id, fundDistributions: [] },
                ],
              },
            },
            // Precondition 5 — Order #2: quantity 1, $60 estimated price, multi-year
            // payment starting next fiscal year, with amount and percentage terms.
            {
              ...baseLine(1, 1, 60),
              fundDistribution: [
                fundDistribution(fundA, 60, FUND_DISTRIBUTION_TYPES.AMOUNT, expenseClass1.id),
              ],
              multiYearPayment: true,
              paymentTerms: {
                totalPrice: 200,
                prepaymentTerm: 2,
                startingFiscalYearId: fiscalYears[1].id,
                fiscalYearDistributions: [
                  {
                    fiscalYearId: fiscalYears[1].id,
                    fundDistributions: [
                      fundDistribution(fundA, 60, FUND_DISTRIBUTION_TYPES.AMOUNT, expenseClass1.id),
                    ],
                  },
                  {
                    fiscalYearId: fiscalYears[2].id,
                    fundDistributions: [
                      fundDistribution(fundB, 70, FUND_DISTRIBUTION_TYPES.PERCENTAGE),
                    ],
                  },
                ],
              },
            },
            // Precondition 6 — Order #3: active package, quantity 1, $200 estimated
            // price, multi-year payment enabled, and its specified two-year schedule.
            {
              ...baseLine(2, 1, 200),
              fundDistribution: [
                fundDistribution(fundA, 200, FUND_DISTRIBUTION_TYPES.AMOUNT, expenseClass1.id),
              ],
              isPackage: true,
              multiYearPayment: true,
              paymentTerms: {
                totalPrice: 200,
                prepaymentTerm: 2,
                startingFiscalYearId: fiscalYears[0].id,
                fiscalYearDistributions: [
                  {
                    fiscalYearId: fiscalYears[0].id,
                    fundDistributions: [
                      fundDistribution(
                        fundA,
                        25,
                        FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                        expenseClass1.id,
                      ),
                      fundDistribution(fundB, 25, FUND_DISTRIBUTION_TYPES.PERCENTAGE),
                    ],
                  },
                  {
                    fiscalYearId: fiscalYears[1].id,
                    fundDistributions: [
                      fundDistribution(fundB, 50, FUND_DISTRIBUTION_TYPES.PERCENTAGE),
                    ],
                  },
                ],
              },
            },
            // Precondition 7 — Order #4: $100 estimated price, multi-year payment
            // disabled, and Fund A/Fund B each distributed at 50 percent.
            {
              ...baseLine(3, 1, 100),
              fundDistribution: [
                fundDistribution(fundA, 50, FUND_DISTRIBUTION_TYPES.PERCENTAGE, expenseClass1.id),
                fundDistribution(fundB, 50, FUND_DISTRIBUTION_TYPES.PERCENTAGE),
              ],
              multiYearPayment: false,
            },
          ];

          return cy
            .wrap(lineData)
            .each((orderLine) => Orders.createOrderViaApi({
              ...NewOrder.getDefaultOrder({
                vendorId: organizationA.id,
                orderType: ORDER_TYPES.ONGOING,
              }),
              ongoing: { isSubscription: false, manualRenewal: false },
            }).then((order) => {
              orders.push(order);
              orderLine.purchaseOrderId = order.id;
              return OrderLines.createOrderLineViaApi(orderLine).then((createdLine) => orderLines.push(createdLine));
            }))
            .then(() => {
              currentFlow.set(R.ORDERS, orders, (entities) => entities.forEach(({ id }) => Orders.deleteOrderViaApi(id, false)));
              currentFlow.set(R.ORDER_LINES, orderLines);
            });
        })
        // Precondition 6: add exactly two titles to Order #3's package PO line.
        .step((currentFlow) => {
          return cy.wrap(currentFlow.get(R.PACKAGE_INSTANCES)).each((instanceData, index) => OrderLines.addPackageTitleViaApi({
            instanceId: instanceData.instanceId,
            poLineId: currentFlow.get(R.ORDER_LINES)[2].id,
            title: packageTitles[index],
          }));
        })
        // Preconditions 4-7: put every ongoing order into Open status.
        .step((currentFlow) => {
          return cy.wrap(currentFlow.get(R.ORDERS)).each((order) => Orders.updateOrderViaApi({
            ...order,
            workflowStatus: ORDER_STATUSES.OPEN,
          }));
        })
        // Precondition 9: create the single Agreement line and link it to Order #1's PO line.
        .step((currentFlow) => {
          return AgreementLines.createViaApi({
            ...AgreementLines.defaultAgreementLine(currentFlow.get(R.AGREEMENT).id),
            description: `AT_C1404906_Agreement_Line_${postfix}`,
            poLines: [{ poLineId: currentFlow.get(R.ORDER_LINES)[0].id }],
          }).then((agreementLine) => currentFlow.set(R.AGREEMENT_LINE, agreementLine, ({ id }) => AgreementLines.deleteViaApi({
            agreementId: currentFlow.get(R.AGREEMENT).id,
            agreementLineId: id,
          })));
        })
        // Precondition 8: create the Invoice for Order #1's vendor in the current fiscal year.
        .step((currentFlow) => {
          const organization = currentFlow.get(R.ORGANIZATIONS)[0];
          const fiscalYear = currentFlow.get(R.FISCAL_YEARS)[0];
          return Invoices.createInvoiceViaApi({
            accountingCode: organization.erpCode,
            fiscalYearId: fiscalYear.id,
            vendorId: organization.id,
          }).then((invoice) => currentFlow.set(R.INVOICE, invoice, ({ id }) => Invoices.deleteInvoiceViaApi(id, { failOnStatusCode: false })));
        })
        // Precondition 8: add exactly two Order #1 invoice lines—one for the $300
        // prepayment total and one with the negative $10 amount.
        .step((currentFlow) => {
          const invoice = currentFlow.get(R.INVOICE);
          const orderLine = currentFlow.get(R.ORDER_LINES)[0];
          const [fundA, fundB] = currentFlow.get(R.FUNDS);
          const invoiceLines = [
            Invoices.getDefaultInvoiceLine({
              accountingCode: currentFlow.get(R.ORGANIZATIONS)[0].erpCode,
              fundDistributions: [fundDistribution(fundA, 150), fundDistribution(fundB, 150)],
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              poLineId: orderLine.id,
              releaseEncumbrance: false,
              subTotal: 300,
            }),
            Invoices.getDefaultInvoiceLine({
              accountingCode: currentFlow.get(R.ORGANIZATIONS)[0].erpCode,
              fundDistributions: [
                fundDistribution(fundA, 50, FUND_DISTRIBUTION_TYPES.PERCENTAGE),
                fundDistribution(fundB, 50, FUND_DISTRIBUTION_TYPES.PERCENTAGE),
              ],
              invoiceId: invoice.id,
              invoiceLineStatus: invoice.status,
              poLineId: orderLine.id,
              releaseEncumbrance: false,
              subTotal: -10,
            }),
          ];

          return cy
            .wrap(invoiceLines)
            .each((invoiceLine, index) => Invoices.createInvoiceLineViaApi(invoiceLine).then((createdLine) => {
              invoiceLines[index] = createdLine;
            }))
            .then(() => currentFlow.set(R.INVOICE_LINES, invoiceLines, (entities) => entities.forEach(({ id }) => Invoices.deleteInvoiceLineViaApi(id))));
        })
        // Precondition 8: move the Invoice to Paid status after both lines exist.
        .step((currentFlow) => {
          return Invoices.changeInvoiceStatusViaApi({
            invoice: currentFlow.get(R.INVOICE),
            status: INVOICE_STATUSES.PAID,
          });
        })
        // Precondition 10: create a user with exactly the nine capability sets named
        // by TestRail (or their legacy permission equivalents outside Eureka).
        .step((currentFlow) => {
          return cy.createTempUser(Cypress.env('eureka') ? [] : legacyPermissions).then((user) => {
            currentFlow.set(R.USER, user, ({ userId }) => Users.deleteViaApi(userId));

            if (Cypress.env('eureka')) {
              return cy.assignCapabilitiesToExistingUser(user.userId, [], requiredCapabilitySets);
            }

            return cy.wrap(user);
          });
        })
        // Preconditions 10-11: log in as the authorized user and land on the Lists main page.
        .step((currentFlow) => {
          return cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
    });

    after('Delete C1404906 data', () => {
      const createdLists = [];

      // This fallback handles an assertion failure between download and per-export
      // cleanup, and removes artifacts left by earlier interrupted runs.
      FileManager.deleteFilesFromDownloadsByMask(downloadedCsvMask);
      const testUser = flow.get(R.USER);
      if (testUser) {
        // Lists are private to their creator. Restore that API session even when UI
        // login failed, then make this test's lists visible to the cleanup admin.
        // This avoids granting the tested user the Delete capability forbidden by
        // the TestRail precondition.
        cy.getUserToken(testUser.username, testUser.password);
        Lists.getViaApi().then(({ body }) => {
          Object.values(listNames).forEach((listName) => {
            const list = body.content.find(({ name }) => name === listName);
            if (list) createdLists.push(list);
          });

          cy.wrap(createdLists).each((list) => Lists.editViaApi(list.id, {
            ...list,
            isPrivate: false,
          }));
        });
      }
      cy.getAdminToken();
      cy.then(() => createdLists.forEach(({ id }) => Lists.deleteRecursivelyViaApi(id)));
      flow.cleanup();
    });

    it(
      'C1404906 Multi-year prepayment data is queryable in Lists app across all PO Line entity types (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'nonParallel', 'C1404906'] },
      () => {
        const fiscalYears = flow.get(R.FISCAL_YEARS);
        const [fundA, fundB] = flow.get(R.FUNDS);
        const [organizationA, organizationB] = flow.get(R.ORGANIZATIONS);
        const [expenseClass1, expenseClass2] = flow.get(R.EXPENSE_CLASSES);
        const orderLines = flow.get(R.ORDER_LINES);
        const orders = flow.get(R.ORDERS);
        const agreement = flow.get(R.AGREEMENT);
        const invoice = flow.get(R.INVOICE);
        const agreementColumns = [
          ...selectedColumnsFor(AGREEMENT_FIELDS),
          AGREEMENT_FIELDS.AGREEMENT.NAME,
          AGREEMENT_FIELDS.INVOICE.VENDOR_INVOICE_NUMBER,
          AGREEMENT_FIELDS.INVOICE_LINE.TOTAL,
        ];
        const oiaColumns = selectedColumnsFor(OIA_FIELDS);
        const order1PaymentTerms = [
          {
            fiscalYear: fiscalYears[0].name,
            code: fundA.code,
            fund: fundA.name,
            expenseClass: expenseClass1.name,
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            value: '75',
          },
          {
            fiscalYear: fiscalYears[0].name,
            code: fundB.code,
            fund: fundB.name,
            expenseClass: '',
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            value: '75',
          },
          {
            fiscalYear: fiscalYears[1].name,
            code: fundA.code,
            fund: fundA.name,
            expenseClass: expenseClass2.name,
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            value: '150',
          },
          {
            fiscalYear: fiscalYears[2].name,
            code: '',
            fund: '',
            expenseClass: '',
            distributionType: '',
            value: '',
          },
        ];
        const commonSelectedValues = [fiscalYears[0].name, '3'];

        cy.log(
          'Step 1. Create a list with record type "Agreements - Invoices - Orders" and open Build query',
        );
        createListAndOpenQuery(
          listNames.agreementsInvoicesOrders,
          Lists.recordTypes.agreementsInvoicesOrders,
          ['Agreement', 'Invoice'],
        );

        cy.log('Step 2. Verify all multi-year prepayment fields are available');
        QueryModal.verifyAvailableFieldOptionsBySearch(fieldsAvailableFor(AGREEMENT_FIELDS));

        cy.log(
          'Step 3. Filter Multi-year prepayment equals True and verify exactly eight Order #1 records',
        );
        selectValue(
          AGREEMENT_FIELDS.PO_LINE.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        addIsolationTagFilter(AGREEMENT_FIELDS.PO_LINE.TAGS, 1);
        testQuery(8);
        QueryModal.verifyPreviewRowsWithContentCount(orderLines[0].poLineNumber, 8);
        orderLines
          .slice(1)
          .forEach(({ poLineNumber }) => QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber));

        cy.log(
          'Step 4. Show and verify the multi-year columns, payment terms, and related agreement/invoice data',
        );
        selectAndVerifyColumns(agreementColumns);
        [
          agreement.name,
          organizationA.name,
          organizationB.name,
          invoice.vendorInvoiceNo,
          fiscalYears[0].name,
          QUERY_BOOLEAN_VALUES.TRUE,
          '3',
          '300',
          '-10',
        ].forEach((value) => QueryModal.verifyRecordWithContentAcrossPreviewTable(value));
        QueryModal.scrollResultTable('top');
        // Capture the row index of the current run's Order #1 POL before scrolling right,
        // because the POL-number column is virtualized out of the DOM once the table scrolls.
        cy.get('div[aria-label="Build query"]')
          .contains(orderLines[0].poLineNumber)
          .closest('[data-row-index]')
          .invoke('attr', 'data-row-index')
          .then((rowAttr) => {
            const polRowIndex = parseInt(rowAttr.replace('row-', ''), 10);
            QueryModal.scrollResultTable('right');
            QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal(
              polRowIndex,
              order1PaymentTerms,
            );
          });

        cy.log(
          'Step 5. Add Payment terms Fiscal year equals FY2 and verify the same eight Order #1 records',
        );
        QueryModal.addNewRow(1);
        selectValue(
          AGREEMENT_FIELDS.PAYMENT_TERMS.FISCAL_YEAR,
          QUERY_OPERATIONS.EQUAL,
          fiscalYears[1].name,
          2,
        );
        testQuery(8);
        QueryModal.verifyAllPreviewRowsContain(orderLines[0].poLineNumber);

        cy.log(
          'Step 6. Add Payment terms Fund equals Fund B and verify the same eight Order #1 records',
        );
        QueryModal.addNewRow(2);
        QueryModal.selectField(AGREEMENT_FIELDS.PAYMENT_TERMS.FUND, 3);
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 3);
        QueryModal.fillInValueTextfield(fundB.name, 3);
        testQuery(8);
        QueryModal.verifyAllPreviewRowsContain(orderLines[0].poLineNumber);

        cy.log('Step 7. Run and save the list, wait for refresh, and verify the selected columns');
        QueryModal.clickRunQueryAndSave();
        verifySavedList(8, agreementColumns);

        cy.log('Step 8. Export selected columns and verify their headers and data');
        exportSelectedColumns(
          listNames.agreementsInvoicesOrders,
          agreementColumns,
          commonSelectedValues,
        );

        cy.log(
          'Step 9. Export all columns, verify entity headers and data, and return to the Lists pane',
        );
        exportAllColumns(
          listNames.agreementsInvoicesOrders,
          [
            AGREEMENT_FIELDS.AGREEMENT.NAME,
            AGREEMENT_FIELDS.INVOICE.VENDOR_INVOICE_NUMBER,
            AGREEMENT_FIELDS.PO.PO_NUMBER,
            AGREEMENT_FIELDS.PO_LINE.PO_LINE_NUMBER,
          ],
          [
            agreement.name,
            organizationA.name,
            organizationB.name,
            invoice.vendorInvoiceNo,
            orders[0].poNumber,
            orderLines[0].poLineNumber,
            fundA.name,
            fundB.name,
          ],
        );
        Lists.closeListDetailsPane();

        cy.log('Step 10. Create a new Order — Invoice Analysis list and open Build query');
        createListAndOpenQuery(
          listNames.orderInvoiceAnalysis,
          Lists.recordTypes.orderInvoiceAnalysis,
        );

        cy.log('Step 11. Verify all multi-year prepayment fields are available');
        QueryModal.verifyAvailableFieldOptionsBySearch(fieldsAvailableFor(OIA_FIELDS));

        cy.log(
          'Step 12. Find multi-year records whose starting FY is not current and verify Order #2',
        );
        selectValue(
          OIA_FIELDS.PO_LINE.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        QueryModal.addNewRow();
        selectValue(
          OIA_FIELDS.PO_LINE.STARTING_FISCAL_YEAR,
          QUERY_OPERATIONS.NOT_EQUAL,
          fiscalYears[0].name,
          1,
        );
        addIsolationTagFilter(OIA_FIELDS.PO_LINE.TAGS, 2, 1);
        testQuery(1);
        QueryModal.verifyPreviewRowsWithContentCount(orderLines[1].poLineNumber, 1);
        QueryModal.verifyRecordWithContent(orderLines[1].poLineNumber);
        [orderLines[0], orderLines[2], orderLines[3]].forEach(({ poLineNumber }) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber);
        });
        selectAndVerifyColumns(oiaColumns);
        QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal(orderLines[1].poLineNumber, [
          {
            fiscalYear: fiscalYears[1].name,
            code: fundA.code,
            fund: fundA.name,
            expenseClass: expenseClass1.name,
            distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            value: '60',
          },
          {
            fiscalYear: fiscalYears[2].name,
            code: fundB.code,
            fund: fundB.name,
            expenseClass: '',
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            value: '70',
          },
        ]);

        cy.log(
          'Step 13. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        saveAndExportList({
          listName: listNames.orderInvoiceAnalysis,
          expectedRecords: 1,
          selectedColumns: oiaColumns,
          selectedValues: [fiscalYears[1].name, '2'],
          allHeaders: [
            OIA_FIELDS.INVOICE.VENDOR_INVOICE_NUMBER,
            OIA_FIELDS.PO.PO_NUMBER,
            OIA_FIELDS.PO_LINE.PO_LINE_NUMBER,
            OIA_FIELDS.FISCAL_YEAR.CODE,
            OIA_FIELDS.FUND.NAME,
          ],
          allValues: [orders[1].poNumber, orderLines[1].poLineNumber, fundA.name, fundB.name],
        });

        cy.log('Step 14. Create a new Purchase order lines list and open Build query');
        createListAndOpenQuery(listNames.purchaseOrderLines, Lists.recordTypes.purchaseOrderLines);

        cy.log('Step 15. Verify all PO-line multi-year prepayment fields are available');
        QueryModal.verifyAvailableFieldOptionsBySearch(polFieldsAvailable);

        cy.log(
          'Step 16. Filter payment-term expense class by prefix and verify Orders #1, #2, and #3',
        );
        enterValue(
          POL_FIELDS.PAYMENT_TERMS.EXPENSE_CLASS,
          QUERY_OPERATIONS.START_WITH,
          expenseClassPrefix,
        );
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        testQuery(3);
        orderLines
          .slice(0, 3)
          .forEach(({ poLineNumber }) => QueryModal.verifyRecordWithContent(poLineNumber));
        selectAndVerifyColumns(selectedPolColumns);
        [0, 1, 2].forEach((index) => {
          const expectedTerms = [
            order1PaymentTerms,
            [
              {
                fiscalYear: fiscalYears[1].name,
                code: fundA.code,
                fund: fundA.name,
                expenseClass: expenseClass1.name,
                distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                value: '60',
              },
              {
                fiscalYear: fiscalYears[2].name,
                code: fundB.code,
                fund: fundB.name,
                expenseClass: '',
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: '70',
              },
            ],
            [
              {
                fiscalYear: fiscalYears[0].name,
                code: fundA.code,
                fund: fundA.name,
                expenseClass: expenseClass1.name,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: '25',
              },
              {
                fiscalYear: fiscalYears[0].name,
                code: fundB.code,
                fund: fundB.name,
                expenseClass: '',
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: '25',
              },
              {
                fiscalYear: fiscalYears[1].name,
                code: fundB.code,
                fund: fundB.name,
                expenseClass: '',
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: '50',
              },
            ],
          ][index];
          QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal(
            orderLines[index].poLineNumber,
            expectedTerms,
          );
        });

        cy.log(
          'Step 17. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        saveAndExportList({
          listName: listNames.purchaseOrderLines,
          expectedRecords: 3,
          selectedColumns: selectedPolColumns,
          selectedValues: ['2', '3', fiscalYears[0].name, fiscalYears[1].name],
          allHeaders: [
            POL_FIELDS.POL.PO_LINE_NUMBER,
            POL_FIELDS.POL.TITLE_OR_PACKAGE,
            POL_FIELDS.PO.PO_NUMBER,
            POL_FIELDS.VENDOR_ORG.NAME,
          ],
          allValues: [
            organizationA.name,
            ...orderLines
              .slice(0, 3)
              .flatMap(({ poLineNumber, titleOrPackage }) => [poLineNumber, titleOrPackage]),
          ],
        });

        cy.log('Step 18. Create a new Purchase order lines with titles list and open Build query');
        createListAndOpenQuery(
          listNames.purchaseOrderLinesWithTitles,
          Lists.recordTypes.purchaseOrderLinesWithTitles,
        );

        cy.log('Step 19. Verify all PO-line multi-year prepayment fields are available');
        QueryModal.verifyAllAvailableFieldOptions(polFieldsAvailable);

        cy.log('Step 20. Filter for empty payment-term funds and verify Orders #1 and #4');
        selectValue(
          POL_FIELDS.PAYMENT_TERMS.FUND,
          QUERY_OPERATIONS.IS_NULL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        testQuery(2);
        [orderLines[0], orderLines[3]].forEach(({ poLineNumber }) => QueryModal.verifyPreviewRowsWithContentCount(poLineNumber, 1));
        [orderLines[1], orderLines[2]].forEach(({ poLineNumber }) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber);
        });

        cy.log('Step 21. Add Multi-year prepayment equals True and verify only Order #1');
        QueryModal.addNewRow(1);
        selectValue(
          POL_FIELDS.POL.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
          2,
        );
        testQuery(1);
        QueryModal.verifyPreviewRowsWithContentCount(orderLines[0].poLineNumber, 1);
        orderLines.slice(1).forEach(({ poLineNumber }) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber);
        });
        selectAndVerifyColumns(selectedPolColumns);

        cy.log(
          'Step 22. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        saveAndExportList({
          listName: listNames.purchaseOrderLinesWithTitles,
          expectedRecords: 1,
          selectedColumns: selectedPolColumns,
          selectedValues: commonSelectedValues,
          allHeaders: [
            POL_FIELDS.POL.PO_LINE_NUMBER,
            POL_FIELDS.POL.TITLE_OR_PACKAGE,
            POL_FIELDS.PO.PO_NUMBER,
          ],
          allValues: [orderLines[0].poLineNumber, orderTitles[0], fiscalYears[2].name],
        });

        cy.log('Step 23. Create a new Receiving pieces list and open Build query');
        createListAndOpenQuery(listNames.receivingPieces, Lists.recordTypes.receivingPieces);

        cy.log('Step 24. Verify all PO-line multi-year prepayment fields are available');
        QueryModal.verifyAllAvailableFieldOptions(polFieldsAvailable);

        cy.log(
          'Step 25. Filter Prepayment term greater than or equal to 3 and verify two Order #1 pieces',
        );
        enterValue(POL_FIELDS.POL.PREPAYMENT_TERM, QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO, '3');
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        testQuery(2);
        QueryModal.verifyPreviewRowsWithContentCount(orderTitles[0], 2);
        orderTitles.slice(1).forEach((title) => {
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(title);
        });
        selectAndVerifyColumns(selectedPolColumns);

        cy.log(
          'Step 26. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        saveAndExportList({
          listName: listNames.receivingPieces,
          expectedRecords: 2,
          selectedColumns: selectedPolColumns,
          selectedValues: commonSelectedValues,
          allHeaders: [
            RECEIVING_PIECES_FIELDS.PIECES.UUID,
            RECEIVING_PIECES_FIELDS.TITLE.TITLE,
            RECEIVING_PIECES_FIELDS.POL.PO_LINE_NUMBER,
            RECEIVING_PIECES_FIELDS.PO.PO_NUMBER,
          ],
          allValues: [orderLines[0].poLineNumber, orderTitles[0]],
        });

        cy.log('Step 27. Create a new Receiving titles list and open Build query');
        createListAndOpenQuery(listNames.receivingTitles, Lists.recordTypes.receivingTitles);

        cy.log('Step 28. Verify all PO-line multi-year prepayment fields are available');
        QueryModal.verifyAllAvailableFieldOptions(polFieldsAvailable);

        cy.log(
          'Step 29. Filter Multi-year prepayment equals True and verify four receiving titles',
        );
        selectValue(
          POL_FIELDS.POL.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        testQuery(4);
        [orderTitles[0], orderTitles[1], ...packageTitles].forEach((title) => QueryModal.verifyPreviewRowsWithContentCount(title, 1));
        QueryModal.verifyRecordWithIdentifierAbsentInResultTable(orderTitles[3]);

        cy.log('Step 30. Add Payment terms Code in Fund B code and verify the same four titles');
        QueryModal.addNewRow(1);
        QueryModal.selectField(POL_FIELDS.PAYMENT_TERMS.FUND_CODE, 2);
        QueryModal.selectOperator(QUERY_OPERATIONS.IN, 2);
        QueryModal.chooseFromValueMultiselect(fundB.code, 2, { exactMatch: true });
        testQuery(4);
        [orderTitles[0], orderTitles[1], ...packageTitles].forEach((title) => QueryModal.verifyRecordWithContent(title));
        selectAndVerifyColumns(selectedPolColumns);

        cy.log(
          'Step 31. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        saveAndExportList({
          listName: listNames.receivingTitles,
          expectedRecords: 4,
          selectedColumns: selectedPolColumns,
          selectedValues: [fundB.code, '2', '3'],
          allHeaders: [
            RECEIVING_PIECES_FIELDS.TITLE.TITLE,
            RECEIVING_PIECES_FIELDS.POL.PO_LINE_NUMBER,
          ],
          allValues: [orderTitles[0], orderTitles[1], ...packageTitles, fundB.name],
        });
      },
    );
  });
});
