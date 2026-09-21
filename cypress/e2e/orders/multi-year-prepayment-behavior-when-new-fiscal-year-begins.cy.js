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

const OrderLineEditForm = { ...OrderLineEditFormFragment, ...MultiYearPaymentTerms };
const OrderTemplateForm = { ...OrderTemplateFormFragment, ...MultiYearPaymentTerms };
const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

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
    if (disabled) form.assertMultiYearPrepaymentCheckedAndDisabled();
    else form.assertMultiYearPrepaymentCheckedAndEnabled();

    form.assertStartingFiscalYearValue(fy1.code);
    form.assertPrepaymentTermValue(2);
    form.assertFiscalYearCards([fy1.code, fy2.code]);
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
    form.assertStartingFiscalYearValue(fy1.code);
    form.assertPrepaymentTermValue(2);
    form.assertFiscalYearCards([fy1.code, fy2.code]);

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

    return OrderLines.updateOrderLineViaApi(updatedLine).then(() => flow.set(resourceKey, updatedLine));
  };

  const waitForFilters = (pane, trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane,
    phase: PANE_REQUEST_PHASES.FILTERS,
    trigger,
  });

  const waitForResults = (pane, trigger) => PaneRequestWaiter.waitForPaneRequests({
    pane,
    trigger,
  });

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      // Precondition 1: FY1 is current; FY2 and FY3 are sequential future fiscal years in one series.
      .step((f) => cy.wrap([R.FY1, R.FY2, R.FY3]).each((key, index) => FiscalYears.createViaApi(buildFiscalYear(index)).then((fy) => {
        f.set(key, fy, () => FiscalYears.deleteFiscalYearViaApi(fy.id, false));
      })))

      // Precondition 2: An active ledger is linked to FY1.
      .step((f) => Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: f.get(R.FY1).id,
        ledgerStatus: LEDGER_STATUSES.ACTIVE,
      }).then((ledger) => f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false))))

      // Precondition 3: Create active Funds A and B for the ledger.
      .step((f) => cy.wrap([R.FUND_A, R.FUND_B]).each((key) => Funds.createViaApi({
        ...Funds.getDefaultFund(),
        ledgerId: f.get(R.LEDGER).id,
        name: `AT_${key}_${postfix}`,
        code: `${key}${postfix}`,
        fundStatus: FUND_STATUSES.ACTIVE,
      }).then(({ fund }) => f.set(key, fund, () => Funds.deleteFundViaApi(fund.id, false)))))

      // Precondition 3: Create active FY1 budgets with $1000 allocated for both funds.
      .step((f) => cy
        .wrap([
          [R.FUND_A, R.BUDGET_A],
          [R.FUND_B, R.BUDGET_B],
        ])
        .each(([fundKey, budgetKey]) => Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: f.get(R.FY1).id,
          fundId: f.get(fundKey).id,
          allocated: 1000,
          budgetStatus: BUDGET_STATUSES.ACTIVE,
        }).then((budget) => f.set(budgetKey, budget, () => Budgets.deleteViaApi(budget.id, false)))))

      // Supporting data: vendor used by the template and both orders.
      .step((f) => NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then((org) => f.set(R.ORG, org, () => Organizations.deleteOrganizationViaApi(org.id))))

      // Supporting data: acquisition method used by both precondition PO lines.
      .step((f) => cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
        })
        .then(({ body }) => f.set(R.ACQ_METHOD, body.acquisitionMethods[0])))

      // Supporting data: tag used to isolate this case's records in shared environments.
      .step((f) => cy
        .createTagApi({ label: testData.isolatingTag })
        .then((id) => f.set(R.TAG, { id, label: testData.isolatingTag }, () => cy.deleteTagApi(id, true))))

      // Supporting data: Inventory instance selected through the PO-line Title lookup in step 5.
      .step((f) => cy
        .getInstanceTypes({ limit: 1 })
        .then((instanceTypes) => InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: testData.createdPolTitle,
            instanceTypeId: instanceTypes[0].id,
          },
        }))
        .then((instance) => f.set(R.INSTANCE, instance, () => InventoryInstance.deleteInstanceViaApi(instance.instanceId))))

      // Precondition 4: Ongoing order template with two-year prepayment and the specified FY distributions.
      .step((f) => OrderTemplates.createOrderTemplateViaApi({
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
      }).then((template) => f.set(R.TEMPLATE, template, () => OrderTemplates.deleteOrderTemplateViaApi(template.id))))

      // Precondition 5: Pending ongoing order with a two-year, $1000 multi-year PO line.
      .step((f) => Orders.createOrderViaApi({
        id: uuid(),
        vendor: f.get(R.ORG).id,
        orderType: ORDER_TYPES.ONGOING,
        ongoing: { isSubscription: false, manualRenewal: false },
        workflowStatus: ORDER_STATUSES.PENDING,
      }).then((order) => f.set(R.ORIGINAL_ORDER, order, () => Orders.deleteOrderViaApi(order.id, false))))

      // Precondition 5: Add the specified multi-year PO line to the pending order.
      .step((f) => OrderLines.createOrderLineViaApi({
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
      }).then((line) => f.set(R.ORIGINAL_POL, line, () => OrderLines.deleteOrderLineViaApi(line.id, false))))

      // Precondition 6: A second ongoing order has a regular (non-multi-year) PO line.
      .step((f) => Orders.createOrderViaApi({
        id: uuid(),
        vendor: f.get(R.ORG).id,
        orderType: ORDER_TYPES.ONGOING,
        ongoing: { isSubscription: false, manualRenewal: false },
        workflowStatus: ORDER_STATUSES.PENDING,
      }).then((order) => f.set(R.NON_MULTI_YEAR_ORDER, order, () => Orders.deleteOrderViaApi(order.id, false))))

      // Precondition 6: Add a regular PO line to the second ongoing order.
      .step((f) => OrderLines.createOrderLineViaApi({
        ...BasicOrderLine.getDefaultOrderLine({
          purchaseOrderId: f.get(R.NON_MULTI_YEAR_ORDER).id,
          title: testData.nonMultiYearPolTitle,
          acquisitionMethod: f.get(R.ACQ_METHOD).id,
        }),
        orderFormat: ORDER_FORMAT_VALUES.OTHER,
        tags: { tagList: [testData.isolatingTag] },
        multiYearPayment: false,
      }).then((line) => f.set(R.NON_MULTI_YEAR_POL, line, () => OrderLines.deleteOrderLineViaApi(line.id, false))))

      // Precondition 7: Advance the series so FY1 is previous, FY2 current, and FY3 future.
      .step((f) => cy
        .wrap([
          [R.FY1, -1],
          [R.FY2, 0],
          [R.FY3, 1],
        ])
        .each(([key, offset]) => {
          const updatedFy = { ...f.get(key), ...DateTools.getFullFiscalYearStartAndEnd(offset) };
          return FiscalYears.updateFiscalYearViaApi(updatedFy).then(() => f.set(key, updatedFy));
        }))

      // Precondition 8: Create a user with only the capabilities specified by the test case.
      .step((f) => cy
        .createTempUser([
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiReceivingViewEditCreate.gui,
          Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui,
          Permissions.uiExportOrders.gui,
        ])
        .then((user) => f.set(R.USER, user, () => Users.deleteViaApi(user.userId))))

      // Precondition 9: Log in at Settings > Orders > Order templates.
      .step((f) => {
        cy.login(f.get(R.USER).username, f.get(R.USER).password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
      });
  });

  after(() => {
    cy.getAdminToken();
    FileManager.deleteFilesFromDownloadsByMask(testData.csvFileName);
    flow.cleanup();
  });

  it(
    'C1404902 Multi-year prepayment behavior when a new fiscal year begins (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1404902'] },
    () => {
      const { fy1, fy2, fy3, fundA, fundB, locale } = flow.ctx();
      const formatAmount = (value) => NumberTools.formatCurrency(value, locale);

      cy.log('Step 1. Open the template, edit it, and expand all accordions');
      OrderTemplates.selectTemplate(testData.templateName);
      OrderTemplates.openEditForm();
      OrderTemplateForm.expandAll();

      OrderTemplateForm.assertMultiYearPrepaymentChecked();
      assertTemplateTerms({ form: OrderTemplateForm, fy1, fy2, fundA, fundB, required: false });

      cy.log('Step 2. Navigate to Orders and create an order from the template');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        OrderLines.selectOrders();
        Orders.waitLoading();
      });

      Orders.createOrderByTemplateAndCapture(
        `${testData.templateName} (${testData.templateCode})`,
      ).then((order) => flow.set(R.CREATED_ORDER, order, () => Orders.deleteOrderViaApi(order.id, false)));

      OrderDetails.waitLoading();

      cy.log('Step 3. Add a PO line and verify the inherited two-year payment terms');
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();

      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
      assertTemplateTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB, required: true });
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      cy.log('Step 4. Open the Starting fiscal year information popover');
      OrderLineEditForm.clickStartingFiscalYearInfoIcon();
      OrderLineEditForm.verifyStartingFiscalYearInfoPopover();

      cy.log('Step 5. Fill required fields and change Starting fiscal year to current FY2');
      OrderLineEditForm.fillItemDetailsTitle({ instanceTitle: testData.createdPolTitle });
      OrderLineEditForm.fillPoLineDetails({
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        orderFormat: ORDER_FORMAT_VALUES.OTHER,
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
      });
      OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '1000', quantityPhysical: '1' });
      OrderLineEditForm.fillPrepaymentTotalPrice(1000);

      OrderLineEditForm.selectStartingFiscalYear(fy2.code); // Current FY

      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
      [fy2.code, fy3.code].forEach((fyCode) => OrderLineEditForm.assertFiscalYearCardFundDistributions({ fyCode, distributions: [] }));
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log(
        'Step 6. Expand Starting fiscal year and verify previous, current, and future options',
      );
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      [fy1.code, fy2.code, fy3.code].forEach((fyCode) => OrderLineEditForm.assertFiscalYearOptionPresent(fyCode));

      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      cy.log('Step 7. Populate both FY cards and save the new PO line');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy2.code });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 50,
      });

      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy3.code });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 25,
      });

      OrderLineEditForm.addFundDistributionInFYCard(fy3.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({
        fyCode: fy3.code,
        rowIndex: 1,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 25,
        rowIndex: 1,
      });

      cy.intercept(REQUEST_METHOD.POST, '**/orders/order-lines').as('createdPol');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });

      cy.wait('@createdPol').then(({ response }) => {
        flow.set(R.CREATED_POL, response.body, () => OrderLines.deleteOrderLineViaApi(response.body.id, false));
        return updateLineWithIsolatingTag(R.CREATED_POL);
      });

      OrderLineDetails.assertMultiYearPrepaymentChecked();
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

      cy.log('Step 8. Edit the created PO line and verify its current/future payment terms');
      OrderLineDetails.openOrderLineEditForm();

      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
      OrderLineEditForm.assertStartingFiscalYearValue(fy2.code);
      OrderLineEditForm.assertFiscalYearCards([fy2.code, fy3.code]);
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
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log('Step 9. Verify the Starting FY list excludes the previous fiscal year');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      OrderLineEditForm.assertFiscalYearOptionAbsent(fy1.code);
      [fy2.code, fy3.code].forEach((fyCode) => OrderLineEditForm.assertFiscalYearOptionPresent(fyCode));

      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      cy.log('Step 10. Cancel edit, open the original PO line, and edit it');
      OrderLineEditForm.clickCancelButton();
      OrderLineDetails.backToOrderDetails();
      Orders.selectOrderByPONumber(flow.get(R.ORIGINAL_ORDER).poNumber);
      OrderDetails.openPolDetails(testData.originalPolTitle);
      OrderLineDetails.openOrderLineEditForm();

      assertTwoYearTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB });
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      cy.log('Step 11. Change the original PO line Starting FY to current FY2');
      OrderLineEditForm.selectStartingFiscalYear(fy2.code); // Current FY

      [fy2.code, fy3.code].forEach((fyCode) => OrderLineEditForm.assertFiscalYearCardFundDistributions({ fyCode, distributions: [] }));

      cy.log('Step 12. Verify previous, current, and future Starting FY options remain available');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      [fy1.code, fy2.code, fy3.code].forEach((fyCode) => OrderLineEditForm.assertFiscalYearOptionPresent(fyCode));

      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      cy.log(
        'Step 13. Cancel and close without saving; verify the original payment terms are restored',
      );
      OrderLineEditForm.cancelWithUnsavedChanges();

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

      cy.log('Step 14. Return to the order and open it');
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: flow.get(R.ORIGINAL_ORDER).poNumber });

      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      cy.log(
        'Step 15. Edit its PO line and verify locked multi-year fields and editable distributions',
      );
      OrderDetails.openPolDetails(testData.originalPolTitle);
      OrderLineDetails.openOrderLineEditForm();

      assertTwoYearTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB, disabled: true });
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '1000', prepaymentTerm: '2', startingFiscalYear: fy1.code },
        disabled: { totalPrice: false, prepaymentTerm: true, startingFiscalYear: true },
      });
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy1.code, fy2.code]);

      cy.log('Step 16. Close edit and close the order with a closure reason');
      OrderLineEditForm.clickCancelButton();
      OrderLineDetails.backToOrderDetails();
      Orders.closeOrder(ORDER_SYSTEM_CLOSING_REASONS.COMPLETE);

      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);

      cy.log(
        'Step 17. Edit the closed order line and verify the same locked fields and original values',
      );
      OrderDetails.openPolDetails(testData.originalPolTitle);
      OrderLineDetails.openOrderLineEditForm();

      assertTwoYearTerms({ form: OrderLineEditForm, fy1, fy2, fundA, fundB, disabled: true });
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '1000', prepaymentTerm: '2', startingFiscalYear: fy1.code },
        disabled: { totalPrice: false, prepaymentTerm: true, startingFiscalYear: true },
      });

      cy.log('Step 18. Close edit and duplicate the closed order');
      OrderLineEditForm.clickCancelButton();
      OrderLineDetails.backToOrderDetails();

      cy.intercept(REQUEST_METHOD.POST, '**/orders/composite-orders').as('duplicatedOrder');
      Orders.duplicateOrder({ verifyModal: true });
      InteractorsTools.checkCalloutMessage(OrderStates.orderDuplicatedSuccessfully);

      cy.wait('@duplicatedOrder').then(({ response }) => {
        flow.set(R.DUPLICATED_ORDER, response.body, () => Orders.deleteOrderViaApi(response.body.id, false));
      });

      OrderDetails.waitLoading();
      flow.step((currentFlow) => {
        OrderDetails.verifyOrderTitle(
          OrderStates.purchaseOrderPaneTitle(currentFlow.get(R.DUPLICATED_ORDER).poNumber),
        );
      });

      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.log('Step 19. Open the duplicated PO line and verify its copied payment terms');
      OrderDetails.openPolDetails(testData.originalPolTitle);

      OrderLineDetails.assertMultiYearPrepaymentChecked();
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

      cy.log(
        'Step 20. Edit the duplicated PO line and verify only the current FY card is removable',
      );
      OrderLineDetails.openOrderLineEditForm();

      OrderLineEditForm.assertFiscalYearCards([fy1.code, fy2.code]);
      OrderLineEditForm.assertOnlyFiscalYearCardRemovable([fy1.code, fy2.code], fy2.code);
      OrderLineEditForm.assertAddFiscalYearButtonEnabled();

      cy.log('Step 21. Find this test data in Order lines and export selected prepayment fields');
      OrderLineEditForm.clickCancelButton();

      waitForFilters(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        Orders.selectOrderLines();
        OrderLines.waitLoading();
      });

      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.searchByParameter(ORDER_LINE_SEARCH_INDEX_LABELS.KEYWORD, `${titlePrefix}*`));
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByTags([testData.isolatingTag]));

      Orders.clickExportResultsToCsvButton();
      ExportSettingsModal.checkExportSelectedPolFieldsRadioButton();
      csvFields.forEach((field) => ExportSettingsModal.selectOrderLineFieldsToExport(field));
      ExportSettingsModal.verifySelectedPolFields(csvFields);

      ExportSettingsModal.clickExportButton();

      cy.log('Step 22. Open the CSV and verify the exported multi-year prepayment data');
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

      cy.log('Step 23. Return to Order lines, reset all filters, and verify the Multi-year filter');
      OrderLines.clearAllFilters();
      OrderLines.expandFilterAccordion(ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT);

      OrderLines.assertCheckboxFilterValues(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES, COMMON_BUTTON_LABELS.NO],
        { checked: false, expandAccordion: false },
      );

      cy.log('Step 24. Select Multi-year prepayment Yes and verify only multi-year lines remain');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByCheckboxOptions(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES],
        { expandAccordion: false },
      ));
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByTags([testData.isolatingTag]));

      flow.step((currentFlow) => {
        OrderLines.checkOrderLineFilterInList(currentFlow.get(R.ORIGINAL_POL).poLineNumber);
        OrderLines.checkOrderLineFilterInList(currentFlow.get(R.CREATED_POL).poLineNumber);
        OrderLines.assertOrderLineAbsent(currentFlow.get(R.NON_MULTI_YEAR_POL).poLineNumber);
      });

      cy.log(
        'Step 25. Select No as well and verify both multi-year and regular lines are returned',
      );
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByCheckboxOptions(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.NO],
        { expandAccordion: false },
      ));
      OrderLines.checkOrderLineFilterInList(flow.get(R.NON_MULTI_YEAR_POL).poLineNumber);

      cy.log(
        'Step 26. Uncheck No, select Receipt status Pending, and verify the pending multi-year lines',
      );
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByCheckboxOptions(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.NO],
        { expandAccordion: false },
      ));
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByCheckboxOptions(ORDER_LINE_FILTER_LABELS.RECEIPT_STATUS, [
        RECEIPT_STATUS_SELECTED.PENDING,
      ]));

      flow.step((currentFlow) => {
        OrderLines.checkOrderLineFilterInList(currentFlow.get(R.CREATED_POL).poLineNumber);
      });

      cy.log(
        'Step 27. Open Receiving > New > POL lookup and verify the Multi-year prepayment filter',
      );
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        Receiving.waitLoading();
      });
      Receiving.clickNewTitleOption();
      Receiving.verifyNewTitlePageOpened();

      waitForFilters(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => Receiving.clickPOLNumberLookUpButton());

      SelectOrderLinesModal.verifyModalView({ multiselect: false });
      SelectOrderLinesModal.assertCheckboxFilterValues(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES, COMMON_BUTTON_LABELS.NO],
        { checked: false },
      );

      cy.log("Step 28. Select Yes and verify this test's multi-year lines are available");
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => SelectOrderLinesModal.filterByCheckboxes(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES],
        { expandAccordion: false },
      ));
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => SelectOrderLinesModal.filterByTags([testData.isolatingTag]));

      SelectOrderLinesModal.assertSearchResults(
        [testData.originalPolTitle, testData.createdPolTitle],
        { verifyRowCount: false },
      );

      cy.log('Step 29. Search by the first part of the original PO line number');
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => SelectOrderLinesModal.searchByName(
        `${flow.get(R.ORIGINAL_POL).poLineNumber.split('-').slice(0, -1).join('-')}*`,
      ));

      SelectOrderLinesModal.assertSearchResults([testData.originalPolTitle], {
        verifyRowCount: false,
      });

      cy.log(
        'Step 30. Clear the Multi-year filter and verify search results still follow the entered query',
      );
      waitForResults(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => SelectOrderLinesModal.clearFilter(ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT));

      SelectOrderLinesModal.assertCheckboxFilterValues(
        ORDER_LINE_FILTER_LABELS.MULTI_YEAR_PREPAYMENT,
        [COMMON_BUTTON_LABELS.YES, COMMON_BUTTON_LABELS.NO],
        { checked: false },
      );
      SelectOrderLinesModal.assertSearchFieldValue(
        `${flow.get(R.ORIGINAL_POL).poLineNumber.split('-').slice(0, -1).join('-')}*`,
      );
      SelectOrderLinesModal.assertSearchResults([testData.originalPolTitle], {
        verifyRowCount: false,
      });
    },
  );
});
