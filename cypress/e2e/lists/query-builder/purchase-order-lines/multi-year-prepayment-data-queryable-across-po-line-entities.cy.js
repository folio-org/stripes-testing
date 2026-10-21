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

// Use the Node task so progress is visible in the Jenkins console.
const trace = (message) => cy.task('log', `[C1404906] ${message}`);

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
  trace('QueryModal.selectField [site 1]');
  QueryModal.selectField(field, row);
  trace('QueryModal.selectOperator [site 2]');
  QueryModal.selectOperator(operator, row);
  trace('QueryModal.chooseValueSelect [site 3]');
  QueryModal.chooseValueSelect(value, row);
};

const enterValue = (field, operator, value, row = 0) => {
  trace('QueryModal.selectField [site 4]');
  QueryModal.selectField(field, row);
  trace('QueryModal.selectOperator [site 5]');
  QueryModal.selectOperator(operator, row);
  trace('QueryModal.fillInValueTextfield [site 6]');
  QueryModal.fillInValueTextfield(value, row);
};

const addIsolationTagFilter = (field, row, afterRow = row - 1) => {
  trace('QueryModal.addNewRow [site 7]');
  QueryModal.addNewRow(afterRow);
  trace('QueryModal.selectField [site 8]');
  QueryModal.selectField(field, row);
  trace('QueryModal.selectOperator [site 9]');
  QueryModal.selectOperator(QUERY_OPERATIONS.IN, row);
  trace('QueryModal.fillInValueMultiselect [site 10]');
  QueryModal.fillInValueMultiselect(isolationTag, row);
};

const testQuery = (expectedRecords) => {
  trace('QueryModal.testQuery [site 11]');
  QueryModal.testQuery();
  trace('QueryModal.waitForQueryTestToFinish [site 12]');
  QueryModal.waitForQueryTestToFinish();
  trace('QueryModal.verifyNumberOfMatchedRecords [site 13]');
  QueryModal.verifyNumberOfMatchedRecords(expectedRecords);
  trace('QueryModal.verifyNumberOfRowsInPreviewTable [site 14]');
  QueryModal.verifyNumberOfRowsInPreviewTable(expectedRecords);
};

const createListAndOpenQuery = (name, recordType, recordTypeKeywords) => {
  trace('Lists.openNewListPane [site 15]');
  Lists.openNewListPane();
  trace('Lists.setName [site 16]');
  Lists.setName(name);
  if (recordTypeKeywords) {
    trace('Lists.selectRecordTypeByKeywords [site 17]');
    Lists.selectRecordTypeByKeywords(recordTypeKeywords[0], recordTypeKeywords);
  } else {
    trace('Lists.selectRecordType [site 18]');
    Lists.selectRecordType(recordType);
  }
  Lists.buildQuery();
  trace('QueryModal.verify [site 19]');
  QueryModal.verify();
};

const selectAndVerifyColumns = (columns) => {
  trace('QueryModal.clickShowColumnsButton [site 20]');
  QueryModal.clickShowColumnsButton();
  columns.forEach((column) => {
    trace('QueryModal.selectCheckboxInShowColumnsBySearch [site 21]');
    return QueryModal.selectCheckboxInShowColumnsBySearch(column);
  });
  // Each selection is verified while its filtered checkbox is mounted. The preview
  // grid virtualizes columns according to schema order, so all selected headers are
  // not guaranteed to exist in the DOM at the same horizontal scroll position.
  trace('QueryModal.clickShowColumnsButton [site 22]');
  QueryModal.clickShowColumnsButton();
};

const verifySavedList = (expectedRecords, columns) => {
  trace('Lists.viewUpdatedList [site 23]');
  Lists.viewUpdatedList();
  if (expectedRecords === 1) {
    trace('Lists.verifySingleRecordNumber [site 24]');
    Lists.verifySingleRecordNumber();
  } else if (expectedRecords !== null) {
    trace('Lists.verifyRecordsNumber [site 25]');
    Lists.verifyRecordsNumber(expectedRecords);
  }
  columns.forEach((column) => {
    trace('Lists.verifyResultColumnDisplayed [site 26]');
    return Lists.verifyResultColumnDisplayed(column);
  });
};

const exportSelectedColumns = (listName, columns, expectedValues) => {
  trace('FileManager.deleteFile [site 27]');
  FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${listName}.csv`);
  trace('Lists.openActions [site 28]');
  Lists.openActions();
  trace('Lists.exportListVisibleColumns [site 29]');
  Lists.exportListVisibleColumns();
  trace('ListsFile.verifyDownloadedCsvContains [site 30]');
  ListsFile.verifyDownloadedCsvContains(listName, { headers: columns, values: expectedValues });
};

const exportAllColumns = (listName, expectedHeaders, expectedValues) => {
  // Both export actions use the list name. Removing the selected-columns file prevents
  // Chrome from suffixing the all-columns download and makes the assertion deterministic.
  trace('FileManager.deleteFile [site 31]');
  FileManager.deleteFile(`${Cypress.config('downloadsFolder')}/${listName}.csv`);
  trace('Lists.openActions [site 32]');
  Lists.openActions();
  trace('Lists.exportList [site 33]');
  Lists.exportList();
  trace('ListsFile.verifyDownloadedCsvContains [site 34]');
  ListsFile.verifyDownloadedCsvContains(listName, {
    headers: expectedHeaders,
    values: expectedValues,
  });
  // Keep the downloads directory clean after a successful export assertion. The
  // suite-level cleanup below is the fallback when an assertion fails mid-export.
  trace('FileManager.deleteFile [site 35]');
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
  trace('QueryModal.clickRunQueryAndSave [site 36]');
  QueryModal.clickRunQueryAndSave();
  trace('verifySavedList [site 37]');
  verifySavedList(expectedRecords, selectedColumns);
  trace('exportSelectedColumns [site 38]');
  exportSelectedColumns(listName, selectedColumns, selectedValues);
  trace('exportAllColumns [site 39]');
  exportAllColumns(listName, allHeaders, allValues);
  trace('Lists.closeListDetailsPane [site 40]');
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

// The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
// #freeze pipeline deadlock
describe('Lists', () => {
  describe('Query Builder', () => {
    const flow = new ExecutionFlowManager();
    const orderTitles = [1, 2, 3, 4].map(
      (number) => `AT_C1404906_Order_${number}_Title_${postfix}`,
    );
    const packageTitles = [1, 2].map((number) => `AT_C1404906_Package_Title_${number}_${postfix}`);

    before('Create C1404906 preconditions', () => {
      trace('SETUP: start');
      trace('FileManager.deleteFilesFromDownloadsByMask [site 41]');
      FileManager.deleteFilesFromDownloadsByMask(downloadedCsvMask);
      trace('cy.getAdminToken [site 42]');
      cy.getAdminToken();
      trace('cy.clearAllLocalStorage [site 43]');
      cy.clearAllLocalStorage();

      flow
        // Test isolation support: tag every PO line so shared-tenant queries return only this run's data.
        .step((currentFlow) => {
          trace('SETUP: flow step 1');
          trace('Organizations.createTagViaApi [site 44]');
          return Organizations.createTagViaApi(isolationTag).then((tagId) => currentFlow.set(R.TAG_ID, tagId, (id) => {
            trace('Organizations.deleteTagByIdViaApi [site 45]');
            return Organizations.deleteTagByIdViaApi(id);
          }));
        })
        // Supporting data required to create the physical PO lines from Preconditions 4-7.
        .step((currentFlow) => {
          trace('SETUP: flow step 2');
          trace('cy.getLocations [site 46]');
          return cy
            .getLocations({ limit: 1 })
            .then((location) => currentFlow.set(R.LOCATION, location));
        })
        .step((currentFlow) => {
          trace('SETUP: flow step 3');
          trace('cy.getDefaultMaterialType');
          return cy
            .getDefaultMaterialType()
            .then((materialType) => currentFlow.set(R.MATERIAL_TYPE, materialType));
        })
        .step((currentFlow) => {
          trace('SETUP: flow step 4');
          trace('cy.getAcquisitionMethodsApi [site 47]');
          return cy
            .getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            })
            .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
        })
        // Precondition 9 support: create the two organizations attached to the Agreement.
        .step((currentFlow) => {
          trace('SETUP: flow step 5');
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

          trace('cy.wrap [site 48]');
          return cy
            .wrap(organizations)
            .each((organization) => {
              trace('Organizations.createOrganizationViaApi [site 49]');
              return Organizations.createOrganizationViaApi(organization).then((id) => {
                organization.id = id;
              });
            })
            .then(() => currentFlow.set(R.ORGANIZATIONS, organizations, (entities) => entities.forEach(({ id }) => {
              trace('Organizations.deleteOrganizationViaApi [site 50]');
              return Organizations.deleteOrganizationViaApi(id);
            })));
        })
        // Precondition 1: create the current and two future fiscal years with one shared series;
        // the first fiscal year's period includes today.
        .step((currentFlow) => {
          trace('SETUP: flow step 6');
          const fiscalYears = [0, 1, 2].map((yearOffset) => ({
            ...FiscalYears.getDefaultFiscalYear(),
            ...DateTools.getFullFiscalYearStartAndEnd(yearOffset),
            code: `${fiscalYearSeries}${currentYear + yearOffset}`,
            name: `AT_C1404906_Fiscal_Year_${currentYear + yearOffset}_${postfix}`,
            series: fiscalYearSeries,
          }));

          trace('cy.wrap [site 51]');
          return cy
            .wrap(fiscalYears)
            .each((fiscalYear) => {
              trace('FiscalYears.createViaApi [site 52]');
              return FiscalYears.createViaApi(fiscalYear).then((createdFiscalYear) => Object.assign(fiscalYear, createdFiscalYear));
            })
            .then(() => currentFlow.set(R.FISCAL_YEARS, fiscalYears, (entities) => entities.forEach(({ id }) => {
              trace('FiscalYears.deleteFiscalYearViaApi [site 53]');
              return FiscalYears.deleteFiscalYearViaApi(id, false);
            })));
        })
        // Precondition 2: create an active Ledger linked to the current fiscal year.
        .step((currentFlow) => {
          trace('SETUP: flow step 7');
          trace('Ledgers.createViaApi [site 54]');
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: currentFlow.get(R.FISCAL_YEARS)[0].id,
            ledgerStatus: LEDGER_STATUSES.ACTIVE,
            name: `AT_C1404906_Ledger_${postfix}`,
          }).then((ledger) => currentFlow.set(R.LEDGER, ledger, ({ id }) => {
            trace('Ledgers.deleteLedgerViaApi [site 55]');
            return Ledgers.deleteLedgerViaApi(id, false);
          }));
        })
        // Precondition 3 support: create the Electronic and Print expense classes that
        // will be enabled on every current and planned Fund A budget.
        .step((currentFlow) => {
          trace('SETUP: flow step 8');
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

          trace('cy.wrap [site 56]');
          return cy
            .wrap(expenseClasses)
            .each((expenseClass) => {
              trace('ExpenseClasses.createExpenseClassViaApi [site 57]');
              return ExpenseClasses.createExpenseClassViaApi(expenseClass).then(
                (createdExpenseClass) => Object.assign(expenseClass, createdExpenseClass),
              );
            })
            .then(() => currentFlow.set(R.EXPENSE_CLASSES, expenseClasses, (entities) => entities.forEach(({ id }) => {
              trace('ExpenseClasses.deleteExpenseClassViaApi [site 58]');
              return ExpenseClasses.deleteExpenseClassViaApi(id, { failOnStatusCode: false });
            })));
        })
        // Precondition 3: create active Fund A and Fund B under the active Ledger.
        .step((currentFlow) => {
          trace('SETUP: flow step 9');
          const funds = ['A', 'B'].map((suffix) => ({
            ...Funds.getDefaultFund(),
            code: `${suffix}${compactPostfix}`,
            fundStatus: FUND_STATUSES.ACTIVE,
            ledgerId: currentFlow.get(R.LEDGER).id,
            name: `AT_C1404906_Fund_${suffix}_${postfix}`,
          }));

          trace('cy.wrap [site 59]');
          return cy
            .wrap(funds)
            .each((fund, index) => {
              trace('Funds.createViaApi [site 60]');
              return Funds.createViaApi(fund).then((response) => {
                funds[index] = response.fund || response;
              });
            })
            .then(() => currentFlow.set(R.FUNDS, funds, (entities) => entities.forEach(({ id }) => {
              trace('Funds.deleteFundViaApi [site 61]');
              return Funds.deleteFundViaApi(id, false);
            })));
        })
        // Precondition 3: give both funds a $1000 current budget and two $1000 planned
        // budgets; enable both expense classes on every Fund A budget.
        .step((currentFlow) => {
          trace('SETUP: flow step 10');
          const budgets = [];
          const [expenseClass1, expenseClass2] = currentFlow.get(R.EXPENSE_CLASSES);

          trace('cy.wrap [site 62]');
          return cy
            .wrap(currentFlow.get(R.FISCAL_YEARS))
            .each((fiscalYear, fiscalYearIndex) => {
              trace('cy.wrap [site 63]');
              return cy.wrap(currentFlow.get(R.FUNDS)).each((fund, fundIndex) => {
                trace('Budgets.createViaApi [site 64]');
                return Budgets.createViaApi({
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
                }).then((budget) => budgets.push(budget));
              });
            })
            .then(() => currentFlow.set(R.BUDGETS, budgets, (entities) => entities.forEach(({ id }) => {
              trace('Budgets.deleteViaApi [site 65]');
              return Budgets.deleteViaApi(id, false);
            })));
        })
        // Precondition 9 support: the snapshot tenant normally contains only one
        // Agreement organization role. Preserve the original pick list and add a
        // temporary second role so the Agreement can use two genuinely different roles.
        .step((currentFlow) => {
          trace('SETUP: flow step 11');
          trace('cy.okapiRequest [site 66]');
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

              trace('cy.okapiRequest [site 67]');
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
                .then(({ body: updatedCategory }) => currentFlow.set(R.AGREEMENT_ORGANIZATION_ROLE_CATEGORY, updatedCategory, () => {
                  trace('cy.okapiRequest [site 68]');
                  return cy.okapiRequest({
                    method: 'PUT',
                    path: `erm/refdata/${originalCategory.id}`,
                    body: originalCategory,
                    isDefaultSearchParamsRequired: false,
                    failOnStatusCode: false,
                  });
                }));
            });
        })
        // Precondition 9: create an active Agreement starting today and attach two
        // organizations using the tenant's first and second organization roles.
        .step((currentFlow) => {
          trace('SETUP: flow step 12');
          const [organizationA, organizationB] = currentFlow.get(R.ORGANIZATIONS);
          const [firstRole, secondRole] = currentFlow.get(
            R.AGREEMENT_ORGANIZATION_ROLE_CATEGORY,
          ).values;

          trace('Agreements.createViaApi [site 69]');
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
          }).then((agreement) => currentFlow.set(R.AGREEMENT, agreement, ({ id }) => {
            trace('Agreements.deleteViaApi [site 70]');
            return Agreements.deleteViaApi(id);
          }));
        })
        // Precondition 6 support: create the two inventory instances added as titles
        // to the active package PO line from Order #3.
        .step((currentFlow) => {
          trace('SETUP: flow step 13');
          const packageInstances = [];
          trace('cy.wrap [site 71]');
          return cy
            .wrap(packageTitles)
            .each((instanceTitle) => {
              trace('InventoryInstance.createInstanceViaApi [site 72]');
              return InventoryInstance.createInstanceViaApi({ instanceTitle }).then(
                ({ instanceData }) => packageInstances.push(instanceData),
              );
            })
            .then(() => currentFlow.set(R.PACKAGE_INSTANCES, packageInstances, (entities) => entities.forEach(({ instanceId }) => {
              trace('InventoryInstance.deleteInstanceViaApi [site 73]');
              return InventoryInstance.deleteInstanceViaApi(instanceId);
            })));
        })
        // Preconditions 4-7: create four ongoing orders and their PO lines with the
        // exact multi-year, pricing, fund-distribution, and inventory settings below.
        .step((currentFlow) => {
          trace('SETUP: flow step 14');
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

          trace('cy.wrap [site 74]');
          return cy
            .wrap(lineData)
            .each((orderLine) => {
              trace('Orders.createOrderViaApi [site 75]');
              return Orders.createOrderViaApi({
                ...NewOrder.getDefaultOrder({
                  vendorId: organizationA.id,
                  orderType: ORDER_TYPES.ONGOING,
                }),
                ongoing: { isSubscription: false, manualRenewal: false },
              }).then((order) => {
                orders.push(order);
                orderLine.purchaseOrderId = order.id;
                trace('OrderLines.createOrderLineViaApi [site 76]');
                return OrderLines.createOrderLineViaApi(orderLine).then((createdLine) => orderLines.push(createdLine));
              });
            })
            .then(() => {
              currentFlow.set(R.ORDERS, orders, (entities) => entities.forEach(({ id }) => {
                trace('Orders.deleteOrderViaApi [site 77]');
                return Orders.deleteOrderViaApi(id, false);
              }));
              currentFlow.set(R.ORDER_LINES, orderLines);
            });
        })
        // Precondition 6: add exactly two titles to Order #3's package PO line.
        .step((currentFlow) => {
          trace('SETUP: flow step 15');
          trace('cy.wrap [site 78]');
          return cy.wrap(currentFlow.get(R.PACKAGE_INSTANCES)).each((instanceData, index) => {
            trace('OrderLines.addPackageTitleViaApi [site 79]');
            return OrderLines.addPackageTitleViaApi({
              instanceId: instanceData.instanceId,
              poLineId: currentFlow.get(R.ORDER_LINES)[2].id,
              title: packageTitles[index],
            });
          });
        })
        // Preconditions 4-7: put every ongoing order into Open status.
        .step((currentFlow) => {
          trace('SETUP: flow step 16');
          trace('cy.wrap [site 80]');
          return cy.wrap(currentFlow.get(R.ORDERS)).each((order) => {
            trace('Orders.updateOrderViaApi [site 81]');
            return Orders.updateOrderViaApi({
              ...order,
              workflowStatus: ORDER_STATUSES.OPEN,
            });
          });
        })
        // Precondition 9: create the single Agreement line and link it to Order #1's PO line.
        .step((currentFlow) => {
          trace('SETUP: flow step 17');
          trace('AgreementLines.createViaApi [site 82]');
          return AgreementLines.createViaApi({
            ...AgreementLines.defaultAgreementLine(currentFlow.get(R.AGREEMENT).id),
            description: `AT_C1404906_Agreement_Line_${postfix}`,
            poLines: [{ poLineId: currentFlow.get(R.ORDER_LINES)[0].id }],
          }).then((agreementLine) => currentFlow.set(R.AGREEMENT_LINE, agreementLine, ({ id }) => {
            trace('AgreementLines.deleteViaApi [site 83]');
            return AgreementLines.deleteViaApi({
              agreementId: currentFlow.get(R.AGREEMENT).id,
              agreementLineId: id,
            });
          }));
        })
        // Precondition 8: create the Invoice for Order #1's vendor in the current fiscal year.
        .step((currentFlow) => {
          trace('SETUP: flow step 18');
          const organization = currentFlow.get(R.ORGANIZATIONS)[0];
          const fiscalYear = currentFlow.get(R.FISCAL_YEARS)[0];
          trace('Invoices.createInvoiceViaApi [site 84]');
          return Invoices.createInvoiceViaApi({
            accountingCode: organization.erpCode,
            fiscalYearId: fiscalYear.id,
            vendorId: organization.id,
          }).then((invoice) => currentFlow.set(R.INVOICE, invoice, ({ id }) => {
            trace('Invoices.deleteInvoiceViaApi [site 85]');
            return Invoices.deleteInvoiceViaApi(id, { failOnStatusCode: false });
          }));
        })
        // Precondition 8: add exactly two Order #1 invoice lines—one for the $300
        // prepayment total and one with the negative $10 amount.
        .step((currentFlow) => {
          trace('SETUP: flow step 19');
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

          trace('cy.wrap [site 86]');
          return cy
            .wrap(invoiceLines)
            .each((invoiceLine, index) => {
              trace('Invoices.createInvoiceLineViaApi [site 87]');
              return Invoices.createInvoiceLineViaApi(invoiceLine).then((createdLine) => {
                invoiceLines[index] = createdLine;
              });
            })
            .then(() => currentFlow.set(R.INVOICE_LINES, invoiceLines, (entities) => entities.forEach(({ id }) => {
              trace('Invoices.deleteInvoiceLineViaApi [site 88]');
              return Invoices.deleteInvoiceLineViaApi(id);
            })));
        })
        // Precondition 8: move the Invoice to Paid status after both lines exist.
        .step((currentFlow) => {
          trace('SETUP: flow step 20');
          trace('Invoices.changeInvoiceStatusViaApi [site 89]');
          return Invoices.changeInvoiceStatusViaApi({
            invoice: currentFlow.get(R.INVOICE),
            status: INVOICE_STATUSES.PAID,
          });
        })
        // Precondition 10: create a user with exactly the nine capability sets named
        // by TestRail (or their legacy permission equivalents outside Eureka).
        .step((currentFlow) => {
          trace('SETUP: flow step 21');
          trace('cy.createTempUser [site 90]');
          return cy.createTempUser(Cypress.env('eureka') ? [] : legacyPermissions).then((user) => {
            currentFlow.set(R.USER, user, ({ userId }) => {
              trace('Users.deleteViaApi [site 91]');
              return Users.deleteViaApi(userId);
            });

            if (Cypress.env('eureka')) {
              trace('cy.assignCapabilitiesToExistingUser [site 92]');
              return cy.assignCapabilitiesToExistingUser(user.userId, [], requiredCapabilitySets);
            }

            trace('cy.wrap [site 93]');
            return cy.wrap(user);
          });
        })
        // Preconditions 10-11: log in as the authorized user and land on the Lists main page.
        .step((currentFlow) => {
          trace('SETUP: flow step 22');
          trace('cy.login [site 94]');
          return cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });

      trace('SETUP: complete');
    });

    after('Delete C1404906 data', () => {
      trace('CLEANUP: start');
      const createdLists = [];

      // This fallback handles an assertion failure between download and per-export
      // cleanup, and removes artifacts left by earlier interrupted runs.
      trace('FileManager.deleteFilesFromDownloadsByMask [site 95]');
      FileManager.deleteFilesFromDownloadsByMask(downloadedCsvMask);
      const testUser = flow.get(R.USER);
      if (testUser) {
        // Lists are private to their creator. Restore that API session even when UI
        // login failed, then make this test's lists visible to the cleanup admin.
        // This avoids granting the tested user the Delete capability forbidden by
        // the TestRail precondition.
        trace('cy.getUserToken [site 96]');
        cy.getUserToken(testUser.username, testUser.password);
        trace('Lists.getViaApi [site 97]');
        Lists.getViaApi().then(({ body }) => {
          Object.values(listNames).forEach((listName) => {
            const list = body.content.find(({ name }) => name === listName);
            if (list) createdLists.push(list);
          });

          trace('cy.wrap [site 98]');
          cy.wrap(createdLists).each((list) => {
            trace('Lists.editViaApi [site 99]');
            return Lists.editViaApi(list.id, {
              ...list,
              isPrivate: false,
            });
          });
        });
      }
      trace('cy.getAdminToken [site 100]');
      cy.getAdminToken();
      trace('cy.then [site 101]');
      cy.then(() => createdLists.forEach(({ id }) => {
        trace('Lists.deleteRecursivelyViaApi [site 102]');
        return Lists.deleteRecursivelyViaApi(id);
      }));
      flow.cleanup();

      trace('CLEANUP: complete');
    });

    // The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
    // #freeze pipeline deadlock
    it(
      'C1404906 Multi-year prepayment data is queryable in Lists app across all PO Line entity types (thunderjet)',
      { tags: ['criticalPathBroken', 'thunderjet', 'nonParallel', 'C1404906Broken'] },
      () => {
        trace('TEST: start');
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

        trace(
          'Step 1. Create a list with record type "Agreements - Invoices - Orders" and open Build query',
        );
        trace('createListAndOpenQuery [site 103]');
        createListAndOpenQuery(
          listNames.agreementsInvoicesOrders,
          Lists.recordTypes.agreementsInvoicesOrders,
          ['Agreement', 'Invoice'],
        );

        trace('Step 2. Verify all multi-year prepayment fields are available');
        trace('QueryModal.verifyAvailableFieldOptionsBySearch [site 104]');
        QueryModal.verifyAvailableFieldOptionsBySearch(fieldsAvailableFor(AGREEMENT_FIELDS));

        trace(
          'Step 3. Filter Multi-year prepayment equals True and verify exactly eight Order #1 records',
        );
        trace('selectValue [site 105]');
        selectValue(
          AGREEMENT_FIELDS.PO_LINE.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        trace('addIsolationTagFilter [site 106]');
        addIsolationTagFilter(AGREEMENT_FIELDS.PO_LINE.TAGS, 1);
        trace('testQuery [site 107]');
        testQuery(8);
        trace('QueryModal.verifyPreviewRowsWithContentCount [site 108]');
        QueryModal.verifyPreviewRowsWithContentCount(orderLines[0].poLineNumber, 8);
        orderLines.slice(1).forEach(({ poLineNumber }) => {
          trace('QueryModal.verifyRecordWithIdentifierAbsentInResultTable [site 109]');
          return QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber);
        });

        trace(
          'Step 4. Show and verify the multi-year columns, payment terms, and related agreement/invoice data',
        );
        trace('selectAndVerifyColumns [site 110]');
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
        ].forEach((value) => {
          trace('QueryModal.verifyRecordWithContentAcrossPreviewTable [site 111]');
          return QueryModal.verifyRecordWithContentAcrossPreviewTable(value);
        });
        trace('QueryModal.scrollResultTable [site 112]');
        QueryModal.scrollResultTable('top');
        // Capture the row index of the current run's Order #1 POL before scrolling right,
        // because the POL-number column is virtualized out of the DOM once the table scrolls.
        trace('cy.get [site 113]');
        cy.get('div[aria-label="Build query"]')
          .contains(orderLines[0].poLineNumber)
          .closest('[data-row-index]')
          .invoke('attr', 'data-row-index')
          .then((rowAttr) => {
            const polRowIndex = parseInt(rowAttr.replace('row-', ''), 10);
            trace('QueryModal.scrollResultTable [site 114]');
            QueryModal.scrollResultTable('right');
            trace('QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal [site 115]');
            QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal(
              polRowIndex,
              order1PaymentTerms,
            );
          });

        trace(
          'Step 5. Add Payment terms Fiscal year equals FY2 and verify the same eight Order #1 records',
        );
        trace('QueryModal.addNewRow [site 116]');
        QueryModal.addNewRow(1);
        trace('selectValue [site 117]');
        selectValue(
          AGREEMENT_FIELDS.PAYMENT_TERMS.FISCAL_YEAR,
          QUERY_OPERATIONS.EQUAL,
          fiscalYears[1].name,
          2,
        );
        trace('testQuery [site 118]');
        testQuery(8);
        trace('QueryModal.verifyAllPreviewRowsContain [site 119]');
        QueryModal.verifyAllPreviewRowsContain(orderLines[0].poLineNumber);

        trace(
          'Step 6. Add Payment terms Fund equals Fund B and verify the same eight Order #1 records',
        );
        trace('QueryModal.addNewRow [site 120]');
        QueryModal.addNewRow(2);
        trace('QueryModal.selectField [site 121]');
        QueryModal.selectField(AGREEMENT_FIELDS.PAYMENT_TERMS.FUND, 3);
        trace('QueryModal.selectOperator [site 122]');
        QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 3);
        trace('QueryModal.fillInValueTextfield [site 123]');
        QueryModal.fillInValueTextfield(fundB.name, 3);
        trace('testQuery [site 124]');
        testQuery(8);
        trace('QueryModal.verifyAllPreviewRowsContain [site 125]');
        QueryModal.verifyAllPreviewRowsContain(orderLines[0].poLineNumber);

        trace('Step 7. Run and save the list, wait for refresh, and verify the selected columns');
        trace('QueryModal.clickRunQueryAndSave [site 126]');
        QueryModal.clickRunQueryAndSave();
        trace('verifySavedList [site 127]');
        verifySavedList(8, agreementColumns);

        trace('Step 8. Export selected columns and verify their headers and data');
        trace('exportSelectedColumns [site 128]');
        exportSelectedColumns(
          listNames.agreementsInvoicesOrders,
          agreementColumns,
          commonSelectedValues,
        );

        trace(
          'Step 9. Export all columns, verify entity headers and data, and return to the Lists pane',
        );
        trace('exportAllColumns [site 129]');
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
        trace('Lists.closeListDetailsPane [site 130]');
        Lists.closeListDetailsPane();

        trace('Step 10. Create a new Order — Invoice Analysis list and open Build query');
        trace('createListAndOpenQuery [site 131]');
        createListAndOpenQuery(
          listNames.orderInvoiceAnalysis,
          Lists.recordTypes.orderInvoiceAnalysis,
        );

        trace('Step 11. Verify all multi-year prepayment fields are available');
        trace('QueryModal.verifyAvailableFieldOptionsBySearch [site 132]');
        QueryModal.verifyAvailableFieldOptionsBySearch(fieldsAvailableFor(OIA_FIELDS));

        trace(
          'Step 12. Find multi-year records whose starting FY is not current and verify Order #2',
        );
        trace('selectValue [site 133]');
        selectValue(
          OIA_FIELDS.PO_LINE.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        trace('QueryModal.addNewRow [site 134]');
        QueryModal.addNewRow();
        trace('selectValue [site 135]');
        selectValue(
          OIA_FIELDS.PO_LINE.STARTING_FISCAL_YEAR,
          QUERY_OPERATIONS.NOT_EQUAL,
          fiscalYears[0].name,
          1,
        );
        trace('addIsolationTagFilter [site 136]');
        addIsolationTagFilter(OIA_FIELDS.PO_LINE.TAGS, 2, 1);
        trace('testQuery [site 137]');
        testQuery(1);
        trace('QueryModal.verifyPreviewRowsWithContentCount [site 138]');
        QueryModal.verifyPreviewRowsWithContentCount(orderLines[1].poLineNumber, 1);
        trace('QueryModal.verifyRecordWithContent [site 139]');
        QueryModal.verifyRecordWithContent(orderLines[1].poLineNumber);
        [orderLines[0], orderLines[2], orderLines[3]].forEach(({ poLineNumber }) => {
          trace('QueryModal.verifyRecordWithIdentifierAbsentInResultTable [site 140]');
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber);
        });
        trace('selectAndVerifyColumns [site 141]');
        selectAndVerifyColumns(oiaColumns);
        trace('QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal [site 142]');
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

        trace(
          'Step 13. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        trace('saveAndExportList [site 143]');
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

        trace('Step 14. Create a new Purchase order lines list and open Build query');
        trace('createListAndOpenQuery [site 144]');
        createListAndOpenQuery(listNames.purchaseOrderLines, Lists.recordTypes.purchaseOrderLines);

        trace('Step 15. Verify all PO-line multi-year prepayment fields are available');
        trace('QueryModal.verifyAvailableFieldOptionsBySearch [site 145]');
        QueryModal.verifyAvailableFieldOptionsBySearch(polFieldsAvailable);

        trace(
          'Step 16. Filter payment-term expense class by prefix and verify Orders #1, #2, and #3',
        );
        trace('enterValue [site 146]');
        enterValue(
          POL_FIELDS.PAYMENT_TERMS.EXPENSE_CLASS,
          QUERY_OPERATIONS.START_WITH,
          expenseClassPrefix,
        );
        trace('addIsolationTagFilter [site 147]');
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        trace('testQuery [site 148]');
        testQuery(3);
        orderLines.slice(0, 3).forEach(({ poLineNumber }) => {
          trace('QueryModal.verifyRecordWithContent [site 149]');
          return QueryModal.verifyRecordWithContent(poLineNumber);
        });
        trace('selectAndVerifyColumns [site 150]');
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
          trace('QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal [site 151]');
          QueryModal.verifyPOLPaymentTermsEmbeddedTableInQueryModal(
            orderLines[index].poLineNumber,
            expectedTerms,
          );
        });

        trace(
          'Step 17. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        trace('saveAndExportList [site 152]');
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

        trace('Step 18. Create a new Purchase order lines with titles list and open Build query');
        trace('createListAndOpenQuery [site 153]');
        createListAndOpenQuery(
          listNames.purchaseOrderLinesWithTitles,
          Lists.recordTypes.purchaseOrderLinesWithTitles,
        );

        trace('Step 19. Verify all PO-line multi-year prepayment fields are available');
        trace('QueryModal.verifyAllAvailableFieldOptions [site 154]');
        QueryModal.verifyAllAvailableFieldOptions(polFieldsAvailable);

        trace('Step 20. Filter for empty payment-term funds and verify Orders #1 and #4');
        trace('selectValue [site 155]');
        selectValue(
          POL_FIELDS.PAYMENT_TERMS.FUND,
          QUERY_OPERATIONS.IS_NULL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        trace('addIsolationTagFilter [site 156]');
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        trace('testQuery [site 157]');
        testQuery(2);
        [orderLines[0], orderLines[3]].forEach(({ poLineNumber }) => {
          trace('QueryModal.verifyPreviewRowsWithContentCount [site 158]');
          return QueryModal.verifyPreviewRowsWithContentCount(poLineNumber, 1);
        });
        [orderLines[1], orderLines[2]].forEach(({ poLineNumber }) => {
          trace('QueryModal.verifyRecordWithIdentifierAbsentInResultTable [site 159]');
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber);
        });

        trace('Step 21. Add Multi-year prepayment equals True and verify only Order #1');
        trace('QueryModal.addNewRow [site 160]');
        QueryModal.addNewRow(1);
        trace('selectValue [site 161]');
        selectValue(
          POL_FIELDS.POL.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
          2,
        );
        trace('testQuery [site 162]');
        testQuery(1);
        trace('QueryModal.verifyPreviewRowsWithContentCount [site 163]');
        QueryModal.verifyPreviewRowsWithContentCount(orderLines[0].poLineNumber, 1);
        orderLines.slice(1).forEach(({ poLineNumber }) => {
          trace('QueryModal.verifyRecordWithIdentifierAbsentInResultTable [site 164]');
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(poLineNumber);
        });
        trace('selectAndVerifyColumns [site 165]');
        selectAndVerifyColumns(selectedPolColumns);

        trace(
          'Step 22. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        trace('saveAndExportList [site 166]');
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

        trace('Step 23. Create a new Receiving pieces list and open Build query');
        trace('createListAndOpenQuery [site 167]');
        createListAndOpenQuery(listNames.receivingPieces, Lists.recordTypes.receivingPieces);

        trace('Step 24. Verify all PO-line multi-year prepayment fields are available');
        trace('QueryModal.verifyAllAvailableFieldOptions [site 168]');
        QueryModal.verifyAllAvailableFieldOptions(polFieldsAvailable);

        trace(
          'Step 25. Filter Prepayment term greater than or equal to 3 and verify two Order #1 pieces',
        );
        trace('enterValue [site 169]');
        enterValue(POL_FIELDS.POL.PREPAYMENT_TERM, QUERY_OPERATIONS.GREATER_THAN_OR_EQUAL_TO, '3');
        trace('addIsolationTagFilter [site 170]');
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        trace('testQuery [site 171]');
        testQuery(2);
        trace('QueryModal.verifyPreviewRowsWithContentCount [site 172]');
        QueryModal.verifyPreviewRowsWithContentCount(orderTitles[0], 2);
        orderTitles.slice(1).forEach((title) => {
          trace('QueryModal.verifyRecordWithIdentifierAbsentInResultTable [site 173]');
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(title);
        });
        trace('selectAndVerifyColumns [site 174]');
        selectAndVerifyColumns(selectedPolColumns);

        trace(
          'Step 26. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        trace('saveAndExportList [site 175]');
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

        trace('Step 27. Create a new Receiving titles list and open Build query');
        trace('createListAndOpenQuery [site 176]');
        createListAndOpenQuery(listNames.receivingTitles, Lists.recordTypes.receivingTitles);

        trace('Step 28. Verify all PO-line multi-year prepayment fields are available');
        trace('QueryModal.verifyAllAvailableFieldOptions [site 177]');
        QueryModal.verifyAllAvailableFieldOptions(polFieldsAvailable);

        trace('Step 29. Filter Multi-year prepayment equals True and verify four receiving titles');
        trace('selectValue [site 178]');
        selectValue(
          POL_FIELDS.POL.MULTI_YEAR_PREPAYMENT,
          QUERY_OPERATIONS.EQUAL,
          QUERY_BOOLEAN_VALUES.TRUE,
        );
        trace('addIsolationTagFilter [site 179]');
        addIsolationTagFilter(POL_FIELDS.POL.TAGS, 1);
        trace('testQuery [site 180]');
        testQuery(4);
        [orderTitles[0], orderTitles[1], ...packageTitles].forEach((title) => {
          trace('QueryModal.verifyPreviewRowsWithContentCount [site 181]');
          return QueryModal.verifyPreviewRowsWithContentCount(title, 1);
        });
        trace('QueryModal.verifyRecordWithIdentifierAbsentInResultTable [site 182]');
        QueryModal.verifyRecordWithIdentifierAbsentInResultTable(orderTitles[3]);

        trace('Step 30. Add Payment terms Code in Fund B code and verify the same four titles');
        trace('QueryModal.addNewRow [site 183]');
        QueryModal.addNewRow(1);
        trace('QueryModal.selectField [site 184]');
        QueryModal.selectField(POL_FIELDS.PAYMENT_TERMS.FUND_CODE, 2);
        trace('QueryModal.selectOperator [site 185]');
        QueryModal.selectOperator(QUERY_OPERATIONS.IN, 2);
        trace('QueryModal.chooseFromValueMultiselect [site 186]');
        QueryModal.chooseFromValueMultiselect(fundB.code, 2, { exactMatch: true });
        trace('testQuery [site 187]');
        testQuery(4);
        [orderTitles[0], orderTitles[1], ...packageTitles].forEach((title) => {
          trace('QueryModal.verifyRecordWithContent [site 188]');
          return QueryModal.verifyRecordWithContent(title);
        });
        trace('selectAndVerifyColumns [site 189]');
        selectAndVerifyColumns(selectedPolColumns);

        trace(
          'Step 31. Repeat save, refresh, selected-columns export, and all-columns export checks',
        );
        trace('saveAndExportList [site 190]');
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

        trace('TEST: complete');
      },
    );
  });
});
