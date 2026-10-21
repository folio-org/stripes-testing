import moment from 'moment';
import uuid from 'uuid';

import {
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  ORDER_LINE_FILTER_LABELS,
  REQUEST_METHOD,
} from '../../support/constants';
import { BUDGET_STATUSES } from '../../support/constants/finance/budget';
import { FUND_DISTRIBUTION_TYPES, FUND_STATUSES } from '../../support/constants/finance/fund';
import { LEDGER_STATUSES } from '../../support/constants/finance/ledger';
import {
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  ORDER_TYPES,
} from '../../support/constants/orders/order';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_LINE_EXPORT_CSV_FIELDS,
  ORDER_LINE_SEARCH_INDEX_LABELS,
  ORDER_FORMAT_VALUES,
  RECEIPT_STATUS_SELECTED,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants/orders/order-line';
import { Permissions } from '../../support/dictionary';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditFormFragment from '../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../support/fragments/orders/orderLines';
import MultiYearPaymentTerms from '../../support/fragments/orders/multiYearPaymentTerms';
import ExportSettingsModal from '../../support/fragments/orders/modals/exportSettingsModal';
import Orders from '../../support/fragments/orders/orders';
import OrderStates from '../../support/fragments/orders/orderStates';
import Receiving from '../../support/fragments/receiving/receiving';
import SettingOrdersNavigationMenu from '../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import OrderTemplateFormFragment from '../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../support/fragments/settings/orders/orderTemplates';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import {
  DateTools,
  ExecutionFlowManager,
  NumberTools,
  PaneRequestWaiter,
} from '../../support/utils';
import FileManager from '../../support/utils/fileManager';
import getRandomStringCode from '../../support/utils/generateTextCode';
import InteractorsTools from '../../support/utils/interactorsTools';
import { parsePrepaymentFiscalYearDistribution } from '../../support/utils/ordersExport';
import getRandomPostfix from '../../support/utils/stringTools';

// Temporary Jenkins diagnostics; remove after the freeze investigation.
const trace = (message) => cy.task('log', `[C1404902] ${message}`);

const OrderLineEditForm = { ...OrderLineEditFormFragment, ...MultiYearPaymentTerms };
const OrderTemplateForm = { ...OrderTemplateFormFragment, ...MultiYearPaymentTerms };
const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

// The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
// #freeze pipeline deadlock
describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  const R = {
    FY1: 'fy1',
    FY2: 'fy2',
    FY3: 'fy3',
    LEDGER: 'ledger',
    FUND_A: 'fundA',
    FUND_B: 'fundB',
    BUDGET_A: 'budgetA',
    BUDGET_B: 'budgetB',
    INSTANCE: 'instance',
    ORG: 'org',
    ACQ_METHOD: 'acqMethod',
    TAG: 'tag',
    TEMPLATE: 'template',
    ORIGINAL_ORDER: 'originalOrder',
    ORIGINAL_POL: 'originalPol',
    NON_MULTI_YEAR_ORDER: 'nonMultiYearOrder',
    NON_MULTI_YEAR_POL: 'nonMultiYearPol',
    CREATED_ORDER: 'createdOrder',
    CREATED_POL: 'createdPol',
    DUPLICATED_ORDER: 'duplicatedOrder',
    DUPLICATED_POL: 'duplicatedPol',
    USER: 'user',
    LOCALE: 'locale',
  };

  const postfix = getRandomPostfix();
  const fiscalYearSeries = getRandomStringCode(5);
  const currentYear = new Date().getFullYear();
  const titlePrefix = `AT_C1404902_${postfix}`;
  const testData = {
    templateName: `AT_C1404902_Template_${postfix}`,
    templateCode: `C14${postfix}`,
    originalPolTitle: `${titlePrefix}_Original`,
    createdPolTitle: `${titlePrefix}_Created`,
    nonMultiYearPolTitle: `${titlePrefix}_SingleYear`,
    isolatingTag: `C1404902_${postfix}`,
    csvFileName: `order-export-${moment().format('YYYY-MM-DD')}-*.csv`,
  };

  const csvFields = [
    ORDER_LINE_EXPORT_CSV_FIELDS.MULTI_YEAR_PREPAYMENT,
    ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_TERM,
    ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_STARTING_FISCAL_YEAR,
    ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_TOTAL_PRICE,
    ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_FISCAL_YEAR_DISTRIBUTIONS,
  ];
  const CSV_HEADERS = {
    MULTI_YEAR: ORDER_LINE_EXPORT_CSV_FIELDS.MULTI_YEAR_PREPAYMENT,
    TERM: ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_TERM,
    STARTING_FY: ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_STARTING_FISCAL_YEAR,
    TOTAL_PRICE: ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_TOTAL_PRICE,
    DISTRIBUTIONS: ORDER_LINE_EXPORT_CSV_FIELDS.PREPAYMENT_FISCAL_YEAR_DISTRIBUTIONS,
  };

  const getExpectedPrepaymentExport = (line, fiscalYearsById, fundsById) => {
    const paymentTerms = line.paymentTerms || {};
    const totalPrice = Number(paymentTerms.totalPrice || 0);

    return {
      multiYear: String(Boolean(line.multiYearPayment)).toLowerCase(),
      term: String(paymentTerms.prepaymentTerm),
      startingFiscalYear: fiscalYearsById.get(paymentTerms.startingFiscalYearId)?.code,
      totalPrice: String(paymentTerms.totalPrice),
      distributions: (paymentTerms.fiscalYearDistributions || []).flatMap(
        ({ fiscalYearId, fundDistributions = [] }) => fundDistributions.map((distribution) => {
          const value = Number(distribution.value);
          const amount =
              distribution.distributionType === FUND_DISTRIBUTION_TYPES.PERCENTAGE
                ? (totalPrice * value) / 100
                : value;

          return {
            fyCode: fiscalYearsById.get(fiscalYearId)?.code,
            fundCode: fundsById.get(distribution.fundId)?.code || '',
            expenseClass: distribution.expenseClassId || '',
            value: String(distribution.value),
            distributionType: distribution.distributionType,
            amount: String(amount),
          };
        }),
      ),
    };
  };

  const buildFiscalYear = (yearOffset) => ({
    ...FiscalYears.getDefaultFiscalYear(),
    ...DateTools.getFullFiscalYearStartAndEnd(yearOffset),
    code: `${fiscalYearSeries}${currentYear + yearOffset}`,
    series: fiscalYearSeries,
  });

  const assertTwoYearTerms = ({ form, fy1, fy2, fundA, fundB, disabled = false }) => {
    if (disabled) {
      trace('form.assertMultiYearPrepaymentCheckedAndDisabled (site 164)');
      form.assertMultiYearPrepaymentCheckedAndDisabled();
    } else {
      trace('form.assertMultiYearPrepaymentCheckedAndEnabled (site 165)');
      form.assertMultiYearPrepaymentCheckedAndEnabled();
    }

    trace('form.assertStartingFiscalYearValue (site 167)');
    form.assertStartingFiscalYearValue(fy1.code);
    trace('form.assertPrepaymentTermValue (site 168)');
    form.assertPrepaymentTermValue(2);
    trace('form.assertFiscalYearCards (site 169)');
    form.assertFiscalYearCards([fy1.code, fy2.code]);
    trace('form.assertFiscalYearCardFundDistributions (site 170)');
    form.assertFiscalYearCardFundDistributions({
      fyCode: fy1.code,
      distributions: [
        {
          fundName: fundA.name,
          fundCode: fundA.code,
          value: 500,
          distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
        },
      ],
    });
    trace('form.assertFiscalYearCardFundDistributions (site 181)');
    form.assertFiscalYearCardFundDistributions({
      fyCode: fy2.code,
      distributions: [
        {
          fundName: fundA.name,
          fundCode: fundA.code,
          value: 250,
          distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
        },
        {
          fundName: fundB.name,
          fundCode: fundB.code,
          value: 250,
          distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
        },
      ],
    });
  };

  const assertTemplateTerms = ({ form, fy1, fy2, fundA, fundB, required }) => {
    trace('form.assertStartingFiscalYearValue (site 201)');
    form.assertStartingFiscalYearValue(fy1.code);
    trace('form.assertPrepaymentTermValue (site 202)');
    form.assertPrepaymentTermValue(2);
    trace('form.assertFiscalYearCards (site 203)');
    form.assertFiscalYearCards([fy1.code, fy2.code]);

    trace('form.assertFiscalYearCardFundDistributions (site 205)');
    form.assertFiscalYearCardFundDistributions(
      {
        fyCode: fy1.code,
        distributions: [
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            value: 50,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          },
        ],
      },
      { required },
    );
    trace('form.assertFiscalYearCardFundDistributions (site 219)');
    form.assertFiscalYearCardFundDistributions(
      {
        fyCode: fy2.code,
        distributions: [
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            value: 25,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          },
          {
            fundName: fundB.name,
            fundCode: fundB.code,
            value: 25,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          },
        ],
      },
      { required },
    );
  };

  const updateLineWithIsolatingTag = (resourceKey) => {
    const line = flow.get(resourceKey);
    const updatedLine = { ...line, tags: { tagList: [testData.isolatingTag] } };

    trace('OrderLines.updateOrderLineViaApi (site 245)');
    return OrderLines.updateOrderLineViaApi(updatedLine).then(() => flow.set(resourceKey, updatedLine));
  };

  const waitForFilters = (pane, trigger) => {
    trace('PaneRequestWaiter.waitForPaneRequests (site 248)');
    return PaneRequestWaiter.waitForPaneRequests({
      pane,
      phase: PANE_REQUEST_PHASES.FILTERS,
      trigger,
    });
  };

  const waitForResults = (pane, trigger) => {
    trace('PaneRequestWaiter.waitForPaneRequests (site 254)');
    return PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger,
    });
  };

  before(() => {
    trace('SETUP: start');

    trace('cy.getAdminToken (site 260)');
    cy.getAdminToken();
    trace('cy.clearLocalStorage (site 261)');
    cy.clearLocalStorage();

    trace('cy.getTenantLocaleApi (site 263)');
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      // Precondition 1: FY1 is current; FY2 and FY3 are sequential future fiscal years in one series.
      .step((f) => {
        trace('FLOW: step 1');
        trace('cy.wrap (site 267)');
        return cy.wrap([R.FY1, R.FY2, R.FY3]).each((key, index) => {
          trace('FiscalYears.createViaApi (site 267)');
          return FiscalYears.createViaApi(buildFiscalYear(index)).then((fy) => {
            f.set(key, fy, () => {
              trace('FiscalYears.deleteFiscalYearViaApi (site 268)');
              return FiscalYears.deleteFiscalYearViaApi(fy.id, false);
            });
          });
        });
      })

      // Precondition 2: An active ledger is linked to FY1.
      .step((f) => {
        trace('FLOW: step 2');
        trace('Ledgers.createViaApi (site 272)');
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: f.get(R.FY1).id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => f.set(R.LEDGER, ledger, () => {
          trace('Ledgers.deleteLedgerViaApi (site 276)');
          return Ledgers.deleteLedgerViaApi(ledger.id, false);
        }));
      })

      // Precondition 3: Create active Funds A and B for the ledger.
      .step((f) => {
        trace('FLOW: step 3');
        trace('cy.wrap (site 279)');
        return cy.wrap([R.FUND_A, R.FUND_B]).each((key) => {
          trace('Funds.createViaApi (site 279)');
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
            name: `AT_${key}_${postfix}`,
            code: `${key}${postfix}`,
            fundStatus: FUND_STATUSES.ACTIVE,
          }).then(({ fund }) => f.set(key, fund, () => {
            trace('Funds.deleteFundViaApi (site 285)');
            return Funds.deleteFundViaApi(fund.id, false);
          }));
        });
      })

      // Precondition 3: Create active FY1 budgets with $1000 allocated for both funds.
      .step((f) => {
        trace('FLOW: step 4');
        trace('cy.wrap (site 288)');
        return cy
          .wrap([
            [R.FUND_A, R.BUDGET_A],
            [R.FUND_B, R.BUDGET_B],
          ])
          .each(([fundKey, budgetKey]) => {
            trace('Budgets.createViaApi (site 293)');
            return Budgets.createViaApi({
              ...Budgets.getDefaultBudget(),
              fiscalYearId: f.get(R.FY1).id,
              fundId: f.get(fundKey).id,
              allocated: 1000,
              budgetStatus: BUDGET_STATUSES.ACTIVE,
            }).then((budget) => f.set(budgetKey, budget, () => {
              trace('Budgets.deleteViaApi (site 299)');
              return Budgets.deleteViaApi(budget.id, false);
            }));
          });
      })

      // Supporting data: vendor used by the template and both orders.
      .step((f) => {
        trace('FLOW: step 5');
        trace('NewOrganization.createViaApi (site 302)');
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then((org) => f.set(R.ORG, org, () => {
          trace('Organizations.deleteOrganizationViaApi (site 302)');
          return Organizations.deleteOrganizationViaApi(org.id);
        }));
      })

      // Supporting data: acquisition method used by both precondition PO lines.
      .step((f) => {
        trace('FLOW: step 6');
        trace('cy.getAcquisitionMethodsApi (site 305)');
        return cy
          .getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
          })
          .then(({ body }) => f.set(R.ACQ_METHOD, body.acquisitionMethods[0]));
      })

      // Supporting data: tag used to isolate this case's records in shared environments.
      .step((f) => {
        trace('FLOW: step 7');
        trace('cy.createTagApi (site 312)');
        return cy.createTagApi({ label: testData.isolatingTag }).then((id) => f.set(R.TAG, { id, label: testData.isolatingTag }, () => {
          trace('cy.deleteTagApi (site 314)');
          return cy.deleteTagApi(id, true);
        }));
      })

      // Supporting data: Inventory instance selected through the PO-line Title lookup in step 5.
      .step((f) => {
        trace('FLOW: step 8');
        trace('cy.getInstanceTypes (site 317)');
        return cy
          .getInstanceTypes({ limit: 1 })
          .then((instanceTypes) => {
            trace('InventoryInstances.createFolioInstanceViaApi (site 319)');
            return InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: testData.createdPolTitle,
                instanceTypeId: instanceTypes[0].id,
              },
            });
          })
          .then((instance) => f.set(R.INSTANCE, instance, () => {
            trace('InventoryInstance.deleteInstanceViaApi (site 325)');
            return InventoryInstance.deleteInstanceViaApi(instance.instanceId);
          }));
      })

      // Precondition 4: Ongoing order template with two-year prepayment and the specified FY distributions.
      .step((f) => {
        trace('FLOW: step 9');
        trace('OrderTemplates.createOrderTemplateViaApi (site 328)');
        return OrderTemplates.createOrderTemplateViaApi({
          ...OrderTemplates.getDefaultOrderTemplate({}),
          templateName: testData.templateName,
          templateCode: testData.templateCode,
          orderType: ORDER_TYPES.ONGOING,
          vendor: f.get(R.ORG).id,
          multiYearPayment: true,
          paymentTerms: {
            prepaymentTerm: 2,
            startingFiscalYearId: f.get(R.FY1).id,
            fiscalYearDistributions: [
              {
                fiscalYearId: f.get(R.FY1).id,
                fundDistributions: [
                  {
                    fundId: f.get(R.FUND_A).id,
                    code: f.get(R.FUND_A).code,
                    distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                    value: 50,
                  },
                ],
              },
              {
                fiscalYearId: f.get(R.FY2).id,
                fundDistributions: [
                  {
                    fundId: f.get(R.FUND_A).id,
                    code: f.get(R.FUND_A).code,
                    distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                    value: 25,
                  },
                  {
                    fundId: f.get(R.FUND_B).id,
                    code: f.get(R.FUND_B).code,
                    distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                    value: 25,
                  },
                ],
              },
            ],
          },
        }).then((template) => f.set(R.TEMPLATE, template, () => {
          trace('OrderTemplates.deleteOrderTemplateViaApi (site 369)');
          return OrderTemplates.deleteOrderTemplateViaApi(template.id);
        }));
      })

      // Precondition 5: Pending ongoing order with a two-year, $1000 multi-year PO line.
      .step((f) => {
        trace('FLOW: step 10');
        trace('Orders.createOrderViaApi (site 372)');
        return Orders.createOrderViaApi({
          id: uuid(),
          vendor: f.get(R.ORG).id,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
          workflowStatus: ORDER_STATUSES.PENDING,
        }).then((order) => f.set(R.ORIGINAL_ORDER, order, () => {
          trace('Orders.deleteOrderViaApi (site 378)');
          return Orders.deleteOrderViaApi(order.id, false);
        }));
      })

      // Precondition 5: Add the specified multi-year PO line to the pending order.
      .step((f) => {
        trace('FLOW: step 11');
        trace('OrderLines.createOrderLineViaApi (site 381)');
        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: f.get(R.ORIGINAL_ORDER).id,
            title: testData.originalPolTitle,
            listUnitPrice: 1000,
            quantity: 1,
            acquisitionMethod: f.get(R.ACQ_METHOD).id,
          }),
          orderFormat: ORDER_FORMAT_VALUES.OTHER,
          tags: { tagList: [testData.isolatingTag] },
          multiYearPayment: true,
          paymentTerms: {
            totalPrice: 1000,
            prepaymentTerm: 2,
            startingFiscalYearId: f.get(R.FY1).id,
            fiscalYearDistributions: [
              {
                fiscalYearId: f.get(R.FY1).id,
                fundDistributions: [
                  {
                    fundId: f.get(R.FUND_A).id,
                    code: f.get(R.FUND_A).code,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 500,
                  },
                ],
              },
              {
                fiscalYearId: f.get(R.FY2).id,
                fundDistributions: [
                  {
                    fundId: f.get(R.FUND_A).id,
                    code: f.get(R.FUND_A).code,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 250,
                  },
                  {
                    fundId: f.get(R.FUND_B).id,
                    code: f.get(R.FUND_B).code,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 250,
                  },
                ],
              },
            ],
          },
        }).then((line) => f.set(R.ORIGINAL_POL, line, () => {
          trace('OrderLines.deleteOrderLineViaApi (site 427)');
          return OrderLines.deleteOrderLineViaApi(line.id, false);
        }));
      })

      // Precondition 6: A second ongoing order has a regular (non-multi-year) PO line.
      .step((f) => {
        trace('FLOW: step 12');
        trace('Orders.createOrderViaApi (site 430)');
        return Orders.createOrderViaApi({
          id: uuid(),
          vendor: f.get(R.ORG).id,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
          workflowStatus: ORDER_STATUSES.PENDING,
        }).then((order) => f.set(R.NON_MULTI_YEAR_ORDER, order, () => {
          trace('Orders.deleteOrderViaApi (site 436)');
          return Orders.deleteOrderViaApi(order.id, false);
        }));
      })

      // Precondition 6: Add a regular PO line to the second ongoing order.
      .step((f) => {
        trace('FLOW: step 13');
        trace('OrderLines.createOrderLineViaApi (site 439)');
        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: f.get(R.NON_MULTI_YEAR_ORDER).id,
            title: testData.nonMultiYearPolTitle,
            acquisitionMethod: f.get(R.ACQ_METHOD).id,
          }),
          orderFormat: ORDER_FORMAT_VALUES.OTHER,
          tags: { tagList: [testData.isolatingTag] },
          multiYearPayment: false,
        }).then((line) => f.set(R.NON_MULTI_YEAR_POL, line, () => {
          trace('OrderLines.deleteOrderLineViaApi (site 448)');
          return OrderLines.deleteOrderLineViaApi(line.id, false);
        }));
      })

      // Precondition 7: Advance the series so FY1 is previous, FY2 current, and FY3 future.
      .step((f) => {
        trace('FLOW: step 14');
        trace('cy.wrap (site 451)');
        return cy
          .wrap([
            [R.FY1, -1],
            [R.FY2, 0],
            [R.FY3, 1],
          ])
          .each(([key, offset]) => {
            const updatedFy = { ...f.get(key), ...DateTools.getFullFiscalYearStartAndEnd(offset) };
            trace('FiscalYears.updateFiscalYearViaApi (site 459)');
            return FiscalYears.updateFiscalYearViaApi(updatedFy).then(() => f.set(key, updatedFy));
          });
      })

      // Precondition 8: Create a user with only the capabilities specified by the test case.
      .step((f) => {
        trace('FLOW: step 15');
        trace('cy.createTempUser (site 463)');
        return cy
          .createTempUser([
            Permissions.uiOrdersEdit.gui,
            Permissions.uiOrdersCreate.gui,
            Permissions.uiReceivingViewEditCreate.gui,
            Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui,
            Permissions.uiExportOrders.gui,
          ])
          .then((user) => f.set(R.USER, user, () => {
            trace('Users.deleteViaApi (site 471)');
            return Users.deleteViaApi(user.userId);
          }));
      })

      // Precondition 9: Log in at Settings > Orders > Order templates.
      .step((f) => {
        trace('FLOW: step 16');

        trace('cy.login (site 475)');
        cy.login(f.get(R.USER).username, f.get(R.USER).password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        trace('SettingOrdersNavigationMenu.selectOrderTemplates (site 479)');
        SettingOrdersNavigationMenu.selectOrderTemplates();
        trace('OrderTemplates.waitLoading (site 480)');
        OrderTemplates.waitLoading();
      });

    trace('SETUP: complete');
  });

  after(() => {
    trace('CLEANUP: start');

    trace('cy.getAdminToken (site 485)');
    cy.getAdminToken();
    trace('FileManager.deleteFilesFromDownloadsByMask (site 486)');
    FileManager.deleteFilesFromDownloadsByMask(testData.csvFileName);
    trace('flow.cleanup (site 487)');
    flow.cleanup();

    trace('CLEANUP: complete');
  });

  // The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
  // #freeze pipeline deadlock
  it(
    'C1404902 Multi-year prepayment behavior when a new fiscal year begins (thunderjet)',
    { tags: ['extendedPathBroken', 'thunderjet', 'C1404902Broken'] },
    () => {
      trace('TEST: start');

      const { fy1, fy2, fy3, fundA, fundB, locale } = flow.ctx();
      const formatAmount = (value) => NumberTools.formatCurrency(value, locale);

      trace('Step 1. Open the template, edit it, and expand all accordions');
      trace('OrderTemplates.selectTemplate (site 500)');
      OrderTemplates.selectTemplate(testData.templateName);
      trace('OrderTemplates.openEditForm (site 501)');
      OrderTemplates.openEditForm();
      trace('OrderTemplateForm.expandAll (site 502)');
      OrderTemplateForm.expandAll();

      trace('OrderTemplateForm.assertMultiYearPrepaymentChecked (site 504)');
      OrderTemplateForm.assertMultiYearPrepaymentChecked();
      trace('assertTemplateTerms (site 505)');
      assertTemplateTerms({ form: OrderTemplateForm, fy1, fy2, fundA, fundB, required: false });

      trace('Step 2. Navigate to Orders and create an order from the template');
      trace('waitForFilters (site 508)');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
        trace('TopMenuNavigation.navigateToApp (site 509)');
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        trace('OrderLines.selectOrders (site 510)');
        OrderLines.selectOrders();
        trace('Orders.waitLoading (site 511)');
        Orders.waitLoading();
      });

      trace('Orders.createOrderByTemplateAndCapture (site 514)');
      Orders.createOrderByTemplateAndCapture(
        `${testData.templateName} (${testData.templateCode})`,
      ).then((order) => flow.set(R.CREATED_ORDER, order, () => {
        trace('Orders.deleteOrderViaApi (site 516)');
        return Orders.deleteOrderViaApi(order.id, false);
      }));

      trace('OrderDetails.waitLoading (site 518)');
      OrderDetails.waitLoading();

      trace('Step 3. Add a PO line and verify the inherited two-year payment terms');
      trace('OrderDetails.selectAddPOLine (site 521)');
      OrderDetails.selectAddPOLine();
      trace('OrderLineEditForm.waitLoading (site 522)');
      OrderLineEditForm.waitLoading();

      trace('OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled (site 524)');
      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
      trace('assertTemplateTerms (site 525)');
      assertTemplateTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB, required: true });
      trace('OrderLineEditForm.assertAddFiscalYearButtonEnabled (site 526)');
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      trace('Step 4. Open the Starting fiscal year information popover');
      trace('OrderLineEditForm.clickStartingFiscalYearInfoIcon (site 529)');
      OrderLineEditForm.clickStartingFiscalYearInfoIcon();
      trace('OrderLineEditForm.verifyStartingFiscalYearInfoPopover (site 530)');
      OrderLineEditForm.verifyStartingFiscalYearInfoPopover();

      trace('Step 5. Fill required fields and change Starting fiscal year to current FY2');
      trace('OrderLineEditForm.fillItemDetailsTitle (site 533)');
      OrderLineEditForm.fillItemDetailsTitle({ instanceTitle: testData.createdPolTitle });
      trace('OrderLineEditForm.fillPoLineDetails (site 534)');
      OrderLineEditForm.fillPoLineDetails({
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        orderFormat: ORDER_FORMAT_VALUES.OTHER,
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      });
      trace('OrderLineEditForm.fillCostDetails (site 539)');
      OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '1000', quantityPhysical: '1' });
      trace('OrderLineEditForm.fillPrepaymentTotalPrice (site 540)');
      OrderLineEditForm.fillPrepaymentTotalPrice(1000);

      trace('OrderLineEditForm.selectStartingFiscalYear (site 542)');
      OrderLineEditForm.selectStartingFiscalYear(fy2.code); // Current FY

      trace('OrderLineEditForm.assertFiscalYearCards (site 544)');
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      [fy2.code, fy3.code].forEach((fyCode) => {
        trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 545)');
        return OrderLineEditForm.assertFiscalYearCardFundDistributions({
          fyCode,
          distributions: [],
        });
      });
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 546)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      trace('OrderLineEditForm.assertAddFiscalYearButtonDisabled (site 547)');
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      trace('Step 6. Expand Starting fiscal year and verify previous, current, and future options');
      trace('OrderLineEditForm.toggleStartingFiscalYearDropdown (site 552)');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      [fy1.code, fy2.code, fy3.code].forEach((fyCode) => {
        trace('OrderLineEditForm.assertFiscalYearOptionPresent (site 554)');
        return OrderLineEditForm.assertFiscalYearOptionPresent(fyCode);
      });

      trace('OrderLineEditForm.toggleStartingFiscalYearDropdown (site 556)');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      trace('Step 7. Populate both FY cards and save the new PO line');
      trace('OrderLineEditForm.addFundDistributionInFYCard (site 559)');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 560)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('OrderLineEditForm.selectDistributionTypePercentInFYCard (site 565)');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy2.code });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 566)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 50,
      });

      trace('OrderLineEditForm.addFundDistributionInFYCard (site 571)');
      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 572)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('OrderLineEditForm.selectDistributionTypePercentInFYCard (site 577)');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy3.code });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 578)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 25,
      });

      trace('OrderLineEditForm.addFundDistributionInFYCard (site 583)');
      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard (site 584)');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      trace('OrderLineEditForm.selectDistributionTypePercentInFYCard (site 590)');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({
        fyCode: fy3.code,
        rowIndex: 1,
      });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard (site 594)');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 25,
        rowIndex: 1,
      });

      trace('cy.intercept (site 600)');
      cy.intercept(REQUEST_METHOD.POST, '**/orders/order-lines').as('createdPol');
      trace('OrderLineEditForm.clickSaveButton (site 601)');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });

      trace('cy.wait (site 603)');
      cy.wait('@createdPol').then(({ response }) => {
        flow.set(R.CREATED_POL, response.body, () => {
          trace('OrderLines.deleteOrderLineViaApi (site 604)');
          return OrderLines.deleteOrderLineViaApi(response.body.id, false);
        });
        trace('updateLineWithIsolatingTag (site 605)');
        return updateLineWithIsolatingTag(R.CREATED_POL);
      });

      trace('OrderLineDetails.assertMultiYearPrepaymentChecked (site 608)');
      OrderLineDetails.assertMultiYearPrepaymentChecked();
      trace('OrderLineDetails.assertPaymentTerms (site 609)');
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(1000),
        prepaymentTerm: 2,
        startingFiscalYear: fy2.code,
        distributions: [
          {
            fyCode: fy2.code,
            rows: [{ fundName: fundA.name, value: '50%', amount: formatAmount(500) }],
          },
          {
            fyCode: fy3.code,
            rows: [
              { fundName: fundA.name, value: '25%', amount: formatAmount(250) },
              { fundName: fundB.name, value: '25%', amount: formatAmount(250) },
            ],
          },
        ],
      });

      trace('Step 8. Edit the created PO line and verify its current/future payment terms');
      trace('OrderLineDetails.openOrderLineEditForm (site 629)');
      OrderLineDetails.openOrderLineEditForm();

      trace('OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled (site 631)');
      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
      trace('OrderLineEditForm.assertStartingFiscalYearValue (site 632)');
      OrderLineEditForm.assertStartingFiscalYearValue(fy2.code);
      trace('OrderLineEditForm.assertFiscalYearCards (site 633)');
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 634)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy2.code,
        distributions: [
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            value: 50,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          },
        ],
      });
      trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 645)');
      OrderLineEditForm.assertFiscalYearCardFundDistributions({
        fyCode: fy3.code,
        distributions: [
          {
            fundName: fundA.name,
            fundCode: fundA.code,
            value: 25,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          },
          {
            fundName: fundB.name,
            fundCode: fundB.code,
            value: 25,
            distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
          },
        ],
      });
      trace('OrderLineEditForm.assertAddFiscalYearButtonDisabled (site 662)');
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      trace('Step 9. Verify the Starting FY list excludes the previous fiscal year');
      trace('OrderLineEditForm.toggleStartingFiscalYearDropdown (site 665)');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      trace('OrderLineEditForm.assertFiscalYearOptionAbsent (site 667)');
      OrderLineEditForm.assertFiscalYearOptionAbsent(fy1.code);
      [fy2.code, fy3.code].forEach((fyCode) => {
        trace('OrderLineEditForm.assertFiscalYearOptionPresent (site 668)');
        return OrderLineEditForm.assertFiscalYearOptionPresent(fyCode);
      });

      trace('OrderLineEditForm.toggleStartingFiscalYearDropdown (site 670)');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      trace('Step 10. Cancel edit, open the original PO line, and edit it');
      trace('OrderLineEditForm.clickCancelButton (site 673)');
      OrderLineEditForm.clickCancelButton();
      trace('OrderLineDetails.backToOrderDetails (site 674)');
      OrderLineDetails.backToOrderDetails();
      trace('Orders.selectOrderByPONumber (site 675)');
      Orders.selectOrderByPONumber(flow.get(R.ORIGINAL_ORDER).poNumber);
      trace('OrderDetails.openPolDetails (site 676)');
      OrderDetails.openPolDetails(testData.originalPolTitle);
      trace('OrderLineDetails.openOrderLineEditForm (site 677)');
      OrderLineDetails.openOrderLineEditForm();

      trace('assertTwoYearTerms (site 679)');
      assertTwoYearTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB });
      trace('OrderLineEditForm.assertAddFiscalYearButtonEnabled (site 680)');
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      trace('Step 11. Change the original PO line Starting FY to current FY2');
      trace('OrderLineEditForm.selectStartingFiscalYear (site 683)');
      OrderLineEditForm.selectStartingFiscalYear(fy2.code); // Current FY

      [fy2.code, fy3.code].forEach((fyCode) => {
        trace('OrderLineEditForm.assertFiscalYearCardFundDistributions (site 685)');
        return OrderLineEditForm.assertFiscalYearCardFundDistributions({
          fyCode,
          distributions: [],
        });
      });

      trace('Step 12. Verify previous, current, and future Starting FY options remain available');
      trace('OrderLineEditForm.toggleStartingFiscalYearDropdown (site 688)');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      [fy1.code, fy2.code, fy3.code].forEach((fyCode) => {
        trace('OrderLineEditForm.assertFiscalYearOptionPresent (site 690)');
        return OrderLineEditForm.assertFiscalYearOptionPresent(fyCode);
      });

      trace('OrderLineEditForm.toggleStartingFiscalYearDropdown (site 692)');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      trace(
        'Step 13. Cancel and close without saving; verify the original payment terms are restored',
      );
      trace('OrderLineEditForm.cancelWithUnsavedChanges (site 697)');
      OrderLineEditForm.cancelWithUnsavedChanges();

      trace('OrderLineDetails.assertPaymentTerms (site 699)');
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(1000),
        prepaymentTerm: 2,
        startingFiscalYear: fy1.code,
        distributions: [
          {
            fyCode: fy1.code,
            rows: [
              {
                fundName: fundA.name,
                value: '500',
                amount: formatAmount(500),
              },
            ],
          },
          {
            fyCode: fy2.code,
            rows: [
              {
                fundName: fundA.name,
                value: '250',
                amount: formatAmount(250),
              },
              {
                fundName: fundB.name,
                value: '250',
                amount: formatAmount(250),
              },
            ],
          },
        ],
      });

      trace('Step 14. Return to the order and open it');
      trace('OrderLineDetails.backToOrderDetails (site 733)');
      OrderLineDetails.backToOrderDetails();
      trace('OrderDetails.openOrder (site 734)');
      OrderDetails.openOrder({ orderNumber: flow.get(R.ORIGINAL_ORDER).poNumber });

      trace('OrderDetails.checkOrderStatus (site 736)');
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      trace(
        'Step 15. Edit its PO line and verify locked multi-year fields and editable distributions',
      );
      trace('OrderDetails.openPolDetails (site 741)');
      OrderDetails.openPolDetails(testData.originalPolTitle);
      trace('OrderLineDetails.openOrderLineEditForm (site 742)');
      OrderLineDetails.openOrderLineEditForm();

      trace('assertTwoYearTerms (site 744)');
      assertTwoYearTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB, disabled: true });
      trace('OrderLineEditForm.assertPaymentTermsState (site 745)');
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '1000', prepaymentTerm: '2', startingFiscalYear: fy1.code },
        disabled: { totalPrice: false, prepaymentTerm: true, startingFiscalYear: true },
      });
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 749)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy1.code, fy2.code]);

      trace('Step 16. Close edit and close the order with a closure reason');
      trace('OrderLineEditForm.clickCancelButton (site 752)');
      OrderLineEditForm.clickCancelButton();
      trace('OrderLineDetails.backToOrderDetails (site 753)');
      OrderLineDetails.backToOrderDetails();
      trace('Orders.closeOrder (site 754)');
      Orders.closeOrder(ORDER_SYSTEM_CLOSING_REASONS.COMPLETE);

      trace('OrderDetails.checkOrderStatus (site 756)');
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);

      trace(
        'Step 17. Edit the closed order line and verify the same locked fields and original values',
      );
      trace('OrderDetails.openPolDetails (site 761)');
      OrderDetails.openPolDetails(testData.originalPolTitle);
      trace('OrderLineDetails.openOrderLineEditForm (site 762)');
      OrderLineDetails.openOrderLineEditForm();

      trace('assertTwoYearTerms (site 764)');
      assertTwoYearTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB, disabled: true });
      trace('OrderLineEditForm.assertPaymentTermsState (site 765)');
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '1000', prepaymentTerm: '2', startingFiscalYear: fy1.code },
        disabled: { totalPrice: false, prepaymentTerm: true, startingFiscalYear: true },
      });

      trace('Step 18. Close edit and duplicate the closed order');
      trace('OrderLineEditForm.clickCancelButton (site 771)');
      OrderLineEditForm.clickCancelButton();
      trace('OrderLineDetails.backToOrderDetails (site 772)');
      OrderLineDetails.backToOrderDetails();

      trace('cy.intercept (site 774)');
      cy.intercept(REQUEST_METHOD.POST, '**/orders/composite-orders').as('duplicatedOrder');
      trace('Orders.duplicateOrder (site 775)');
      Orders.duplicateOrder({ verifyModal: true });
      trace('InteractorsTools.checkCalloutMessage (site 776)');
      InteractorsTools.checkCalloutMessage(OrderStates.orderDuplicatedSuccessfully);

      trace('cy.wait (site 778)');
      cy.wait('@duplicatedOrder').then(({ response }) => {
        flow.set(R.DUPLICATED_ORDER, response.body, () => {
          trace('Orders.deleteOrderViaApi (site 779)');
          return Orders.deleteOrderViaApi(response.body.id, false);
        });
      });

      trace('OrderDetails.waitLoading (site 782)');
      OrderDetails.waitLoading();
      flow.step((currentFlow) => {
        trace('FLOW: step 17');

        trace('OrderDetails.verifyOrderTitle (site 784)');
        OrderDetails.verifyOrderTitle(
          OrderStates.purchaseOrderPaneTitle(currentFlow.get(R.DUPLICATED_ORDER).poNumber),
        );
      });

      trace('OrderDetails.checkOrderStatus (site 789)');
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      trace('Step 19. Open the duplicated PO line and verify its copied payment terms');
      trace('OrderDetails.openPolDetails (site 792)');
      OrderDetails.openPolDetails(testData.originalPolTitle);

      trace('OrderLineDetails.assertMultiYearPrepaymentChecked (site 794)');
      OrderLineDetails.assertMultiYearPrepaymentChecked();
      trace('OrderLineDetails.assertPaymentTerms (site 795)');
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(1000),
        prepaymentTerm: 2,
        startingFiscalYear: fy1.code,
        distributions: [
          {
            fyCode: fy1.code,
            rows: [
              {
                fundName: fundA.name,
                value: '500',
                amount: formatAmount(500),
              },
            ],
          },
          {
            fyCode: fy2.code,
            rows: [
              {
                fundName: fundA.name,
                value: '250',
                amount: formatAmount(250),
              },
              {
                fundName: fundB.name,
                value: '250',
                amount: formatAmount(250),
              },
            ],
          },
        ],
      });

      trace(
        'Step 20. Edit the duplicated PO line and verify only the current FY card is removable',
      );
      trace('OrderLineDetails.openOrderLineEditForm (site 831)');
      OrderLineDetails.openOrderLineEditForm();

      trace('OrderLineEditForm.assertFiscalYearCards (site 833)');
      OrderLineEditForm.assertFiscalYearCards([fy1.code, fy2.code]);
      trace('OrderLineEditForm.assertOnlyFiscalYearCardRemovable (site 834)');
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy1.code, fy2.code], fy2.code);
      trace('OrderLineEditForm.assertAddFiscalYearButtonEnabled (site 835)');
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      trace('Step 21. Find this test data in Order lines and export selected prepayment fields');
      trace('OrderLineEditForm.clickCancelButton (site 838)');
      OrderLineEditForm.clickCancelButton();

      trace('waitForFilters (site 840)');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Orders.selectOrderLines (site 841)');
        Orders.selectOrderLines();
        trace('OrderLines.waitLoading (site 842)');
        OrderLines.waitLoading();
      });

      trace('waitForResults (site 845)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('OrderLines.searchByParameter (site 845)');
        return OrderLines.searchByParameter(
          ORDER_LINE_SEARCH_INDEX_LABELS.KEYWORD,
          `${titlePrefix}*`,
        );
      });
      trace('waitForResults (site 846)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('OrderLines.filterByTags (site 846)');
        return OrderLines.filterByTags([testData.isolatingTag]);
      });

      trace('Orders.clickExportResultsToCsvButton (site 848)');
      Orders.clickExportResultsToCsvButton();
      trace('ExportSettingsModal.checkExportSelectedPolFieldsRadioButton (site 849)');
      ExportSettingsModal.checkExportSelectedPolFieldsRadioButton();
      csvFields.forEach((field) => {
        trace('ExportSettingsModal.selectOrderLineFieldsToExport (site 850)');
        return ExportSettingsModal.selectOrderLineFieldsToExport(field);
      });
      trace('ExportSettingsModal.verifySelectedPolFields (site 851)');
      ExportSettingsModal.verifySelectedPolFields(csvFields);

      trace('ExportSettingsModal.clickExportButton (site 853)');
      ExportSettingsModal.clickExportButton();

      trace('Step 22. Open the CSV and verify the exported multi-year prepayment data');
      trace('FileManager.convertCsvToJson (site 856)');
      FileManager.convertCsvToJson(testData.csvFileName).then((rows) => {
        const fiscalYearsById = new Map(
          [fy1, fy2, fy3].map((fiscalYear) => [fiscalYear.id, fiscalYear]),
        );
        const fundsById = new Map([fundA, fundB].map((fund) => [fund.id, fund]));
        const originalLineExport = getExpectedPrepaymentExport(
          flow.get(R.ORIGINAL_POL),
          fiscalYearsById,
          fundsById,
        );
        const createdLineExport = getExpectedPrepaymentExport(
          flow.get(R.CREATED_POL),
          fiscalYearsById,
          fundsById,
        );
        const regularLineExport = getExpectedPrepaymentExport(
          flow.get(R.NON_MULTI_YEAR_POL),
          fiscalYearsById,
          fundsById,
        );
        const previousLineExports = [originalLineExport, originalLineExport];
        const previousFyRows = rows.filter(
          (row) => row[CSV_HEADERS.STARTING_FY] === originalLineExport.startingFiscalYear,
        );
        const currentFyRow = rows.find(
          (row) => row[CSV_HEADERS.STARTING_FY] === createdLineExport.startingFiscalYear,
        );
        const regular = rows.find(
          (row) => String(row[CSV_HEADERS.MULTI_YEAR]).toLowerCase() === regularLineExport.multiYear,
        );
        const parse = (row) => parsePrepaymentFiscalYearDistribution(row[CSV_HEADERS.DISTRIBUTIONS]);

        // The original and duplicated PO lines intentionally have identical payment terms.
        expect(previousFyRows).to.have.length(previousLineExports.length);
        expect(currentFyRow).to.not.equal(undefined);
        expect(regular).to.not.equal(undefined);

        previousFyRows.forEach((row, index) => {
          const expected = previousLineExports[index];

          expect(String(row[CSV_HEADERS.MULTI_YEAR]).toLowerCase()).to.equal(expected.multiYear);
          expect(String(row[CSV_HEADERS.TERM])).to.equal(expected.term);
          expect(String(row[CSV_HEADERS.TOTAL_PRICE])).to.equal(expected.totalPrice);
          expect(parse(row)).to.deep.include.members(expected.distributions);
        });

        expect(String(currentFyRow[CSV_HEADERS.MULTI_YEAR]).toLowerCase()).to.equal(
          createdLineExport.multiYear,
        );
        expect(String(currentFyRow[CSV_HEADERS.TERM])).to.equal(createdLineExport.term);
        expect(String(currentFyRow[CSV_HEADERS.TOTAL_PRICE])).to.equal(
          createdLineExport.totalPrice,
        );
        expect(parse(currentFyRow)).to.deep.include.members(createdLineExport.distributions);
        expect(String(regular[CSV_HEADERS.MULTI_YEAR]).toLowerCase()).to.equal(
          regularLineExport.multiYear,
        );
      });

      trace('Step 23. Return to Order lines, reset all filters, and verify the Multi-year filter');
      trace('OrderLines.clearAllFilters (site 916)');
      OrderLines.clearAllFilters();
      trace('OrderLines.expandFilterAccordion (site 917)');
      OrderLines.expandFilterAccordion(ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT);

      trace('OrderLines.assertCheckboxFilterValues (site 919)');
      OrderLines.assertCheckboxFilterValues(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES, COMMON_BUTTON_LABELS.NO],
        { checked: false, expandAccordion: false },
      );

      trace('Step 24. Select Multi-year prepayment Yes and verify only multi-year lines remain');
      trace('waitForResults (site 926)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('OrderLines.filterByCheckboxOptions (site 926)');
        return OrderLines.filterByCheckboxOptions(
          ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
          [COMMON_BUTTON_LABELS.YES],
          { expandAccordion: false },
        );
      });
      trace('waitForResults (site 931)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('OrderLines.filterByTags (site 931)');
        return OrderLines.filterByTags([testData.isolatingTag]);
      });

      flow.step((currentFlow) => {
        trace('FLOW: step 18');

        trace('OrderLines.checkOrderLineFilterInList (site 934)');
        OrderLines.checkOrderLineFilterInList(currentFlow.get(R.ORIGINAL_POL).poLineNumber);
        trace('OrderLines.checkOrderLineFilterInList (site 935)');
        OrderLines.checkOrderLineFilterInList(currentFlow.get(R.CREATED_POL).poLineNumber);
        trace('OrderLines.assertOrderLineAbsent (site 936)');
        OrderLines.assertOrderLineAbsent(currentFlow.get(R.NON_MULTI_YEAR_POL).poLineNumber);
      });

      trace('Step 25. Select No as well and verify both multi-year and regular lines are returned');
      trace('waitForResults (site 942)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('OrderLines.filterByCheckboxOptions (site 942)');
        return OrderLines.filterByCheckboxOptions(
          ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
          [COMMON_BUTTON_LABELS.NO],
          { expandAccordion: false },
        );
      });
      trace('OrderLines.checkOrderLineFilterInList (site 947)');
      OrderLines.checkOrderLineFilterInList(flow.get(R.NON_MULTI_YEAR_POL).poLineNumber);

      trace(
        'Step 26. Uncheck No, select Receipt status Pending, and verify the pending multi-year lines',
      );
      trace('waitForResults (site 952)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('OrderLines.filterByCheckboxOptions (site 952)');
        return OrderLines.filterByCheckboxOptions(
          ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
          [COMMON_BUTTON_LABELS.NO],
          { expandAccordion: false },
        );
      });
      trace('waitForResults (site 957)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('OrderLines.filterByCheckboxOptions (site 957)');
        return OrderLines.filterByCheckboxOptions(ORDER_LINE_FILTER_LABELS.RECEIPT_STATUS, [
          RECEIPT_STATUS_SELECTED.PENDING,
        ]);
      });

      flow.step((currentFlow) => {
        trace('FLOW: step 19');

        trace('OrderLines.checkOrderLineFilterInList (site 962)');
        OrderLines.checkOrderLineFilterInList(currentFlow.get(R.CREATED_POL).poLineNumber);
      });

      trace(
        'Step 27. Open Receiving > New > POL lookup and verify the Multi-year prepayment filter',
      );
      trace('waitForFilters (site 968)');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => {
        trace('TopMenuNavigation.navigateToApp (site 969)');
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        trace('Receiving.waitLoading (site 970)');
        Receiving.waitLoading();
      });
      trace('Receiving.clickNewTitleOption (site 972)');
      Receiving.clickNewTitleOption();
      trace('Receiving.verifyNewTitlePageOpened (site 973)');
      Receiving.verifyNewTitlePageOpened();

      trace('waitForFilters (site 975)');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
        trace('Receiving.clickPOLNumberLookUpButton (site 975)');
        return Receiving.clickPOLNumberLookUpButton();
      });

      trace('SelectOrderLinesModal.verifyModalView (site 977)');
      SelectOrderLinesModal.verifyModalView({ multiselect: false });
      trace('SelectOrderLinesModal.assertCheckboxFilterValues (site 978)');
      SelectOrderLinesModal.assertCheckboxFilterValues(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES, COMMON_BUTTON_LABELS.NO],
        { checked: false },
      );

      trace("Step 28. Select Yes and verify this test's multi-year lines are available");
      trace('waitForResults (site 985)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
        trace('SelectOrderLinesModal.filterByCheckboxes (site 985)');
        return SelectOrderLinesModal.filterByCheckboxes(
          ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
          [COMMON_BUTTON_LABELS.YES],
          { expandAccordion: false },
        );
      });
      trace('waitForResults (site 990)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
        trace('SelectOrderLinesModal.filterByTags (site 990)');
        return SelectOrderLinesModal.filterByTags([testData.isolatingTag]);
      });

      trace('SelectOrderLinesModal.assertSearchResults (site 992)');
      SelectOrderLinesModal.assertSearchResults(
        [testData.originalPolTitle, testData.createdPolTitle],
        { verifyRowCount: false },
      );

      trace('Step 29. Search by the first part of the original PO line number');
      trace('waitForResults (site 998)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
        trace('SelectOrderLinesModal.searchByName (site 998)');
        return SelectOrderLinesModal.searchByName(
          `${flow.get(R.ORIGINAL_POL).poLineNumber.split('-').slice(0, -1).join('-')}*`,
        );
      });

      trace('SelectOrderLinesModal.assertSearchResults (site 1002)');
      SelectOrderLinesModal.assertSearchResults([testData.originalPolTitle], {
        verifyRowCount: false,
      });

      trace(
        'Step 30. Clear the Multi-year filter and verify search results still follow the entered query',
      );
      trace('waitForResults (site 1009)');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
        trace('SelectOrderLinesModal.clearFilter (site 1009)');
        return SelectOrderLinesModal.clearFilter(ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT);
      });

      trace('SelectOrderLinesModal.assertCheckboxFilterValues (site 1011)');
      SelectOrderLinesModal.assertCheckboxFilterValues(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES, COMMON_BUTTON_LABELS.NO],
        { checked: false },
      );
      trace('SelectOrderLinesModal.assertSearchFieldValue (site 1016)');
      SelectOrderLinesModal.assertSearchFieldValue(
        `${flow.get(R.ORIGINAL_POL).poLineNumber.split('-').slice(0, -1).join('-')}*`,
      );
      trace('SelectOrderLinesModal.assertSearchResults (site 1019)');
      SelectOrderLinesModal.assertSearchResults([testData.originalPolTitle], {
        verifyRowCount: false,
      });

      trace('TEST: complete');
    },
  );
});
