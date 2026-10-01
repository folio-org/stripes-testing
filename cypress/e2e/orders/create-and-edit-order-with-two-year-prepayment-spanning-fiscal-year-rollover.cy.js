import moment from 'moment';
import uuid from 'uuid';

import {
  APPLICATION_NAMES,
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  ORDER_LINE_FORM_LABELS,
  ORDER_FORMAT_NAMES,
  RECEIVING_WORKFLOW_NAMES,
  ORDER_LINE_ACCORDION_NAMES,
} from '../../support/constants';
import { BUDGET_STATUSES } from '../../support/constants/finance/budget';
import { FUND_STATUSES } from '../../support/constants/finance/fund';
import { LEDGER_STATUSES } from '../../support/constants/finance/ledger';
import {
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_TYPES,
} from '../../support/constants/orders/order';
import {
  LEDGER_ROLLOVER_BUDGET_VALUE_LABELS,
  ROLLOVER_BUDGET_VALUE_AS,
} from '../../support/constants/finance/rollover';
import { Permissions } from '../../support/dictionary';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FinanceHelper from '../../support/fragments/finance/financeHelper';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditFormFragment from '../../support/fragments/orders/orderLineEditForm';
import MultiYearPaymentTerms from '../../support/fragments/orders/multiYearPaymentTerms';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import DateTools from '../../support/utils/dateTools';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import getRandomPostfix from '../../support/utils/stringTools';
import { ExecutionFlowManager, NumberTools, PaneRequestWaiter } from '../../support/utils';
import { formatDate } from '../../support/utils/acquisitions';
import { Button } from '../../../interactors';
import getRandomStringCode from '../../support/utils/generateTextCode';
import BudgetDetails from '../../support/fragments/finance/budgets/budgetDetails';

const OrderLineEditForm = { ...OrderLineEditFormFragment, ...MultiYearPaymentTerms };
const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;

const TEST_VALUES = {
  TOTAL_PRICE: 199.99,
  FIRST_DISTRIBUTION: 100,
  SECOND_DISTRIBUTION: 50,
  FINAL_DISTRIBUTION: 49.99,
  REMAINING_AFTER_FIRST: '99.99',
  REMAINING_AFTER_SECOND: '49.99',
  OVER_ALLOCATED: 0.01,
  ZERO_AMOUNT: 0,
  PHYSICAL_UNIT_PRICE: 100,
  QUANTITY_PHYSICAL: 1,
};

const VERSION_HISTORY_FIELDS = {
  MULTI_YEAR_PREPAYMENT: ORDER_LINE_FORM_LABELS.MULTI_YEAR_PREPAYMENT,
  FISCAL_YEAR: 'Payment term fiscal year',
  FUND: 'Payment term fund',
  TYPE: 'Payment term type',
  VALUE: 'Payment term value',
  PREPAYMENT_TERM: ORDER_LINE_FORM_LABELS.PREPAYMENT_TERM,
  STARTING_FISCAL_YEAR: ORDER_LINE_FORM_LABELS.STARTING_FISCAL_YEAR,
  TOTAL_PRICE: 'Total price',
  EXPENSE_CLASS: 'Payment term expense class',
};

const VALIDATION_MESSAGES = {
  TOTAL_PRICE: 'Can not be negative or empty',
  PREPAYMENT_TERM: 'Can not be negative or empty',
  STARTING_FISCAL_YEAR: 'Required!',
};

describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  const R = {
    FY_PREVIOUS: 'fyPrevious',
    FY_CURRENT: 'fyCurrent',
    FY_FUTURE: 'fyFuture',
    LEDGER: 'ledger',
    FUND_A: 'fundA',
    FUND_B: 'fundB',
    BUDGET_A: 'budgetA',
    BUDGET_B: 'budgetB',
    EXPENSE_CLASS: 'expenseClass',
    POL_LIMIT: 'polLimit',
    LOCALE: 'locale',
    ORDER: 'order',
    USER: 'user',
    ORG: 'org',
    ACQ_METHOD: 'acqMethod',
    MATERIAL_TYPE: 'materialType',
    LOCATION: 'location',
  };

  const postfix = getRandomPostfix();
  let createdFutureFiscalYearCode;
  const testData = {
    poLineTitle: `AT_C1385639_POL_${postfix}`,
    fiscalYearSeries: getRandomStringCode(5),
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

  const buildFiscalYear = (offset) => ({
    ...FiscalYears.getDefaultFiscalYear(),
    ...DateTools.getFullFiscalYearStartAndEnd(offset),
    code: `${testData.fiscalYearSeries}${new Date().getFullYear() + offset}`,
    series: testData.fiscalYearSeries,
  });

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    flow
      .step(() => {
        return cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));
      })
      .step((f) => {
        cy.log(
          'Precondition 2: Previous fiscal year exists in the shared series; no future fiscal year exists yet.',
        );
        return FiscalYears.createViaApi(buildFiscalYear(-1)).then((fy) => f.set(R.FY_PREVIOUS, fy, () => FiscalYears.deleteFiscalYearViaApi(fy.id, false)));
      })
      .step((f) => {
        cy.log('Precondition 2: Current fiscal year exists in the same series.');
        return FiscalYears.createViaApi(buildFiscalYear(0)).then((fy) => f.set(R.FY_CURRENT, fy, () => FiscalYears.deleteFiscalYearViaApi(fy.id, false)));
      })
      .step((f) => {
        cy.log('Precondition 3: Active ledger is linked to the current fiscal year.');
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: f.get(R.FY_CURRENT).id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false)));
      })
      .step((f) => {
        cy.log('Precondition 4: Active Fund A and Fund B are linked to the ledger.');
        return cy.wrap([R.FUND_A, R.FUND_B]).each((key) => Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: f.get(R.LEDGER).id,
          name: `AT_${key}_${postfix}`,
          code: `${key}_${postfix}`,
          fundStatus: FUND_STATUSES.ACTIVE,
        }).then(({ fund }) => f.set(key, fund, () => Funds.deleteFundViaApi(fund.id, false))));
      })
      .step((f) => {
        cy.log('Precondition 4: Current budgets for both funds have $1000 allocated.');
        return cy
          .wrap([
            [R.FUND_A, R.BUDGET_A],
            [R.FUND_B, R.BUDGET_B],
          ])
          .each(([fundKey, budgetKey]) => Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            fiscalYearId: f.get(R.FY_CURRENT).id,
            fundId: f.get(fundKey).id,
            allocated: 1000,
            budgetStatus: BUDGET_STATUSES.ACTIVE,
          }).then((budget) => f.set(budgetKey, budget, () => Budgets.deleteViaApi(budget.id, false))));
      })
      .step((f) => {
        cy.log('Precondition 5: At least one expense class exists.');
        return ExpenseClasses.createExpenseClassViaApi({
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: `AT_C1385639_ExpenseClass_${postfix}`,
        }).then((expenseClass) => f.set(R.EXPENSE_CLASS, expenseClass, () => ExpenseClasses.deleteExpenseClassViaApi(expenseClass.id)));
      })
      .step((f) => {
        cy.log('Supporting data: Vendor required by the ongoing order.');
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
          (organization) => f.set(R.ORG, organization, () => Organizations.deleteOrganizationViaApi(organization.id)),
        );
      })
      .step((f) => {
        cy.log('Supporting data: Fetch the acquisition method required by the PO-line form.');
        return cy
          .getAcquisitionMethodsApi()
          .then(({ body }) => f.set(R.ACQ_METHOD, body.acquisitionMethods[0]));
      })
      .step((currentFlow) => {
        cy.log('Supporting data: Fetch default material type.');
        return cy
          .getDefaultMaterialType()
          .then((materialType) => currentFlow.set(R.MATERIAL_TYPE, materialType));
      })
      .step((currentFlow) => {
        cy.log('Supporting data: Fetch default location.');
        return cy.getLocations().then((location) => currentFlow.set(R.LOCATION, location));
      })
      .step((f) => {
        cy.log('Precondition 1: Preserve the configured limit and set it above one for this case.');
        return OrderLinesLimit.getPOLLimit().then((settings) => {
          const originalLimit = settings[0];

          f.set(R.POL_LIMIT, originalLimit, () => OrderLinesLimit.setPOLLimitViaApi(originalLimit?.value || 1));
        });
      })
      .step((f) => {
        cy.log('Precondition 6: Ongoing order in Pending status exists without PO lines.');
        return Orders.createOrderViaApi({
          id: uuid(),
          vendor: f.get(R.ORG).id,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
          workflowStatus: ORDER_STATUSES.PENDING,
        }).then((order) => f.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false)));
      })
      .step((f) => {
        cy.log('Precondition 7: Authorized user has only the capabilities listed in TestRail.');
        return cy
          .createTempUser([
            Permissions.uiFinanceViewEditCreateFiscalYear.gui,
            Permissions.uiFinanceViewEditFundAndBudget.gui,
            Permissions.uiFinanceViewEditLedger.gui,
            Permissions.uiFinanceExecuteFiscalYearRollover.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersUnopenpurchaseorders.gui,
          ])
          .then((user) => f.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
      })
      .step((f) => {
        return cy.login(f.get(R.USER).username, f.get(R.USER).password);
      });
  });

  after(() => {
    cy.getAdminToken();

    if (createdFutureFiscalYearCode) {
      FiscalYears.getViaApi({ query: `code=="${createdFutureFiscalYearCode}"` }).then(
        ({ fiscalYears }) => {
          const createdFutureFiscalYear = fiscalYears?.find(
            ({ code }) => code === createdFutureFiscalYearCode,
          );

          if (createdFutureFiscalYear) {
            FiscalYears.deleteFiscalYearViaApi(createdFutureFiscalYear.id, false);
          }
        },
      );
    }

    flow.cleanup();
  });

  it(
    'C1385639 Create and edit an order with two-year prepayment spanning fiscal year rollover',
    { tags: ['criticalPath', 'thunderjet', 'C1385639'] },
    () => {
      const { fyPrevious, fyCurrent, fundA, fundB, expenseClass, order, locale, location } =
        flow.ctx();
      const formatAmount = (value) => NumberTools.formatCurrency(value, locale);

      waitForFilters(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        OrderLines.selectOrders();
        Orders.waitLoading();
      });
      waitForResults(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, flow.get(R.ORDER).poNumber));
      Orders.selectFromResultsList(flow.get(R.ORDER).poNumber);
      OrderDetails.waitLoading();

      cy.log('Step 1. Add a PO line and verify its initial multi-year payment state');
      Orders.createPOLineViaActions({ waitMs: 0 });
      OrderLineEditForm.waitLoading(0);
      OrderLineEditForm.assertMultiYearPrepaymentUnchecked();
      OrderLineEditForm.assertPaymentTermsSectionPresent();
      OrderLineEditForm.assertPaymentTermsCollapsed();
      OrderLineEditForm.expandAccordion(ORDER_LINE_ACCORDION_NAMES.PAYMENT_TERMS);
      OrderLineEditForm.assertPaymentTermsRemainingAmount();
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '' },
        disabled: { totalPrice: true, prepaymentTerm: true, startingFiscalYear: true },
      });

      cy.log('Step 2. Open the Multi-year prepayment information popover');
      OrderLineEditForm.clickMultiYearPrepaymentInfoIcon();
      OrderLineEditForm.verifyMultiYearPrepaymentInfoPopover();
      OrderLineEditForm.clickMultiYearPrepaymentInfoIcon();

      cy.log('Step 3. Open the Payment terms information popover');
      OrderLineEditForm.clickPaymentTermsInfoIcon();
      OrderLineEditForm.verifyPaymentTermsInfoPopover();

      cy.log('Step 4. Enable Multi-year prepayment and verify the initial payment terms state');
      OrderLineEditForm.toggleMultiYearPrepayment();
      OrderLineEditForm.assertMultiYearPrepaymentChecked();
      OrderLineEditForm.assertPaymentTermsExpanded();
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '0' },
        disabled: { totalPrice: false, prepaymentTerm: true, startingFiscalYear: false },
      });

      cy.log('Step 5. Enter the required PO-line fields and verify payment-term validation');
      OrderLineEditForm.fillItemDetails({ title: testData.poLineTitle });
      OrderLineEditForm.fillPoLineDetails({
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        materialType: flow.get(R.MATERIAL_TYPE).name,
      });
      OrderLineEditForm.fillCostDetails({
        physicalUnitPrice: TEST_VALUES.PHYSICAL_UNIT_PRICE,
        quantityPhysical: TEST_VALUES.QUANTITY_PHYSICAL,
      });
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandLocationDropdown();
      OrderLineEditForm.selectLocationFromDropdown(location.name);
      OrderLineEditForm.fillLocationDetails([
        { quantityPhysical: String(TEST_VALUES.QUANTITY_PHYSICAL) },
      ]);
      OrderLineEditForm.selectFundDistributionDropDownValue(
        ORDER_LINE_FORM_LABELS.FUND_ID,
        fundA.name,
      );
      OrderLineEditForm.setFundDistributionValue(TEST_VALUES.PHYSICAL_UNIT_PRICE, 0);
      OrderLineEditForm.clearPrepaymentTotalPrice(); // To check validation for total price;

      cy.do(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE).click());

      OrderLineEditForm.assertPaymentTermsTotalPriceValidationError(
        VALIDATION_MESSAGES.TOTAL_PRICE,
      );
      OrderLineEditForm.assertPaymentTermsPrepaymentTermValidationError(
        VALIDATION_MESSAGES.PREPAYMENT_TERM,
      );
      OrderLineEditForm.assertPaymentTermsStartingFiscalYearValidationError(
        VALIDATION_MESSAGES.STARTING_FISCAL_YEAR,
      );

      cy.log('Step 6. Verify that only the current fiscal year is available');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();
      OrderLineEditForm.assertFiscalYearOptionPresent(fyCurrent.code);
      OrderLineEditForm.assertFiscalYearOptionAbsent(fyPrevious.code);
      OrderLineEditForm.toggleStartingFiscalYearDropdown();

      cy.log('Step 7. Select the current fiscal year and verify one-year validation');
      OrderLineEditForm.selectStartingFiscalYear(fyCurrent.code);
      OrderLineEditForm.assertPrepaymentTermValue(1);
      OrderLineEditForm.assertAtLeastTwoFYsValidationError();
      OrderLineEditForm.assertFiscalYearCards([fyCurrent.code]);
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log('Step 8. Disable Multi-year prepayment');
      OrderLineEditForm.toggleMultiYearPrepayment();
      OrderLineEditForm.assertMultiYearPrepaymentUnchecked();
      OrderLineEditForm.assertPaymentTermsSectionPresent();
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '' },
        disabled: { totalPrice: true, prepaymentTerm: true, startingFiscalYear: true },
      });

      cy.log('Step 9. Save the PO line and verify the details pane');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.assertMultiYearPrepaymentUnchecked();
      OrderLineDetails.assertPaymentTermsSectionAbsent();

      cy.log('Step 10. Create the future fiscal year');
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);

      waitForFilters(PANE_REQUEST_PROFILE_NAMES.FISCAL_YEARS, () => {
        FinanceHelper.selectFiscalYearsNavigation();
        FiscalYears.waitLoading();
      });

      const futureFiscalYear = buildFiscalYear(1);
      futureFiscalYear.periodBeginDate = formatDate(locale, futureFiscalYear.periodStart);
      futureFiscalYear.periodEndDate = formatDate(locale, futureFiscalYear.periodEnd);
      FiscalYears.createDefaultFiscalYear(futureFiscalYear);
      createdFutureFiscalYearCode = futureFiscalYear.code;
      flow.set(R.FY_FUTURE, futureFiscalYear);

      cy.log('Step 11. Reopen the PO line and enable Multi-year prepayment');
      // Path should be cached and user should get back to the last entity
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.waitLoading();
        OrderLineDetails.waitLoading();
      });

      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.toggleMultiYearPrepayment();
      OrderLineEditForm.assertMultiYearPrepaymentChecked();
      OrderLineEditForm.assertPaymentTermsExpanded();

      cy.log('Step 12. Select the current fiscal year and verify two fiscal-year cards');
      OrderLineEditForm.selectStartingFiscalYear(fyCurrent.code);
      OrderLineEditForm.assertFiscalYearCards([fyCurrent.code, futureFiscalYear.code]);
      OrderLineEditForm.assertPrepaymentTermValue(2);
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log(`Step 13. Set total price to ${TEST_VALUES.TOTAL_PRICE}`);
      OrderLineEditForm.fillPrepaymentTotalPrice(TEST_VALUES.TOTAL_PRICE);
      OrderLineEditForm.assertPrepaymentTermsRemainingAmount(formatAmount(TEST_VALUES.TOTAL_PRICE));

      cy.log('Step 14. Add Fund A to the first fiscal-year card');
      OrderLineEditForm.addFundDistributionInFYCard(fyCurrent.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fyCurrent.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fyCurrent.code,
        value: TEST_VALUES.FIRST_DISTRIBUTION,
      });
      OrderLineEditForm.assertPrepaymentTermsDistributionError(
        formatAmount(TEST_VALUES.REMAINING_AFTER_FIRST),
      );

      cy.log('Step 15. Verify the first distribution validation');
      OrderLineEditForm.assertPaymentTermsPercentageValidationError();

      cy.log('Step 16. Add Fund A to the second fiscal-year card');
      OrderLineEditForm.addFundDistributionInFYCard(futureFiscalYear.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: futureFiscalYear.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: futureFiscalYear.code,
        value: TEST_VALUES.SECOND_DISTRIBUTION,
      });
      OrderLineEditForm.assertPrepaymentTermsDistributionError(
        formatAmount(TEST_VALUES.REMAINING_AFTER_SECOND),
      );

      cy.log(
        'Step 17. Add Fund B to the second fiscal-year card and verify the one-cent remainder',
      );
      OrderLineEditForm.addFundDistributionInFYCard(futureFiscalYear.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: futureFiscalYear.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: futureFiscalYear.code,
        value: TEST_VALUES.SECOND_DISTRIBUTION,
        rowIndex: 1,
      });
      OrderLineEditForm.assertPrepaymentTermsDistributionError(
        `-${formatAmount(TEST_VALUES.OVER_ALLOCATED)}`,
      );

      cy.do(Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE).click());

      OrderLineEditForm.assertPaymentTermsPercentageValidationError();

      cy.log(
        `Step 18. Correct Fund B to ${TEST_VALUES.FINAL_DISTRIBUTION} and verify the allocation is complete`,
      );
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: futureFiscalYear.code,
        value: TEST_VALUES.FINAL_DISTRIBUTION,
        rowIndex: 1,
      });
      OrderLineEditForm.assertPrepaymentTermsRemainingAmount(formatAmount(TEST_VALUES.ZERO_AMOUNT));

      cy.log('Step 19. Save the updated PO line');
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.assertMultiYearPrepaymentChecked();
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(TEST_VALUES.TOTAL_PRICE),
        prepaymentTerm: 2,
        startingFiscalYear: fyCurrent.code,
      });

      cy.log('Step 20. Open version history and verify payment-term changes');
      OrderLineDetails.openVersionHistory();
      OrderLines.assertVersionHistoryCard({
        index: 0,
        changedFields: [
          VERSION_HISTORY_FIELDS.MULTI_YEAR_PREPAYMENT,
          VERSION_HISTORY_FIELDS.FISCAL_YEAR,
          VERSION_HISTORY_FIELDS.FUND,
          VERSION_HISTORY_FIELDS.TYPE,
          VERSION_HISTORY_FIELDS.VALUE,
          VERSION_HISTORY_FIELDS.PREPAYMENT_TERM,
          VERSION_HISTORY_FIELDS.STARTING_FISCAL_YEAR,
          VERSION_HISTORY_FIELDS.TOTAL_PRICE,
        ],
      });

      cy.log('Step 21. Close history, open the order, and verify Open status');
      OrderLines.closeVersionHistory();
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder({ orderNumber: order.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      cy.log('Step 22. Perform the configured ledger rollover');
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.LEDGERS, () => TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE));
      FinanceHelper.selectLedgersNavigation();
      Ledgers.searchByName(flow.get(R.LEDGER).name);
      Ledgers.selectLedger(flow.get(R.LEDGER).name);
      Ledgers.rollover();
      Ledgers.fillInCommonRolloverInfoWithCloseAllBudgets(
        futureFiscalYear.code,
        LEDGER_ROLLOVER_BUDGET_VALUE_LABELS.NONE,
        ROLLOVER_BUDGET_VALUE_AS.ALLOCATION,
      );

      cy.log('Step 23. Adjust fiscal-year dates so the future fiscal year includes today');
      FinanceHelper.selectFiscalYearsNavigation();
      FiscalYears.searchByName(fyCurrent.name);
      FiscalYears.selectFiscalYear(fyCurrent.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
        formatDate(locale, moment().subtract(1, 'year').toDate()),
        formatDate(locale, moment().subtract(1, 'day').toDate()),
      );
      FiscalYears.searchByName(futureFiscalYear.name);
      FiscalYears.selectFiscalYear(futureFiscalYear.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.fillTheStartAndEndDateOnCalenderStartDateField(
        formatDate(locale, moment().subtract(1, 'day').toDate()),
        formatDate(locale, moment().add(1, 'year').toDate()),
      );

      cy.log('Step 24. Add the expense class to Fund B current budget');
      FinanceHelper.selectFundsNavigation();
      Funds.searchByName(fundB.name);
      Funds.selectFund(fundB.name);
      Funds.selectBudgetDetails();
      Funds.editBudget();
      Funds.addExpensesClass(expenseClass.name);
      BudgetDetails.checkExpenseClassesTableContent([{ name: 'Unassigned' }, expenseClass]);

      cy.log('Step 25. Return to the PO line and verify payment terms persist');
      // Path should be cached and user should get back to the last entity
      waitForFilters(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.waitLoading();
      });

      OrderDetails.openPolDetails(testData.poLineTitle);
      OrderLineDetails.waitLoading();

      OrderLineDetails.assertMultiYearPrepaymentChecked();
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(TEST_VALUES.TOTAL_PRICE),
        prepaymentTerm: 2,
        startingFiscalYear: fyCurrent.code,
      });

      cy.log('Step 26. Edit the PO line and verify Fund B requires an expense class');
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndDisabled();
      OrderLineEditForm.assertExpenseClassFieldPresentInFYCard(futureFiscalYear.code);

      cy.log('Step 27. Select the expense class for Fund B and save');
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: futureFiscalYear.code,
        expenseClassName: expenseClass.name,
        rowIndex: 1,
      });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(TEST_VALUES.TOTAL_PRICE),
        prepaymentTerm: 2,
        startingFiscalYear: fyCurrent.code,
      });

      cy.log('Step 28. Verify expense-class change in version history');
      OrderLineDetails.openVersionHistory();
      OrderLines.assertVersionHistoryCard({
        index: 0,
        changedFields: [VERSION_HISTORY_FIELDS.EXPENSE_CLASS],
      });
      OrderLines.closeVersionHistory();

      cy.log('Step 29. Unopen the order and delete holdings and items');
      OrderLineDetails.backToOrderDetails();
      OrderDetails.unOpenOrder({ orderNumber: order.poNumber, checkinItems: false });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      cy.log('Step 30. Edit the reopened PO line and verify previous fiscal year is available');
      OrderDetails.openPolDetails(testData.poLineTitle);
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.assertMultiYearPrepaymentCheckedAndEnabled();
      OrderLineEditForm.toggleStartingFiscalYearDropdown();
      OrderLineEditForm.assertFiscalYearOptionPresent(fyCurrent.code);
      OrderLineEditForm.closeSelectionList();
      OrderLineEditForm.assertFiscalYearCards([fyCurrent.code, futureFiscalYear.code]);

      cy.log('Step 31. Disable Multi-year prepayment');
      OrderLineEditForm.toggleMultiYearPrepayment();
      OrderLineEditForm.assertMultiYearPrepaymentUnchecked();
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: '' },
        disabled: { totalPrice: true, prepaymentTerm: true, startingFiscalYear: true },
      });

      cy.log('Step 32. Re-enable Multi-year prepayment and verify terms reset');
      OrderLineEditForm.toggleMultiYearPrepayment();
      OrderLineEditForm.assertMultiYearPrepaymentChecked();
      OrderLineEditForm.assertPaymentTermsState({
        values: { totalPrice: String(0) },
        disabled: { totalPrice: false, prepaymentTerm: true, startingFiscalYear: false },
      });

      cy.log('Step 33. Cancel and discard unsaved changes');
      OrderLineEditForm.cancelWithUnsavedChanges({ waitMs: 0 });
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(TEST_VALUES.TOTAL_PRICE),
        prepaymentTerm: 2,
        startingFiscalYear: fyCurrent.code,
      });

      cy.log('Step 34. Remove both Fund B distributions from the second fiscal year');
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.removeFundDistributionInFYCard({
        fyCode: futureFiscalYear.code,
        rowIndex: 1,
      });
      OrderLineEditForm.removeFundDistributionInFYCard({
        fyCode: futureFiscalYear.code,
        rowIndex: 0,
      });
      OrderLineEditForm.assertFundDistributionAbsentInFYCard(futureFiscalYear.code);
      OrderLineEditForm.assertPrepaymentTermsDistributionError(
        formatAmount(TEST_VALUES.REMAINING_AFTER_FIRST),
      );

      cy.log('Step 35. Change the first fiscal year distribution to percentage and save');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fyCurrent.code });
      MultiYearPaymentTerms.scrollToPaymentTermsSection();
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(TEST_VALUES.TOTAL_PRICE),
        prepaymentTerm: 2,
        startingFiscalYear: fyCurrent.code,
      });

      cy.log('Step 36. Verify version history for the distribution change');
      OrderLineDetails.openVersionHistory();
      OrderLines.assertVersionHistoryCard({
        index: 0,
        changedFields: [
          VERSION_HISTORY_FIELDS.EXPENSE_CLASS,
          VERSION_HISTORY_FIELDS.FUND,
          VERSION_HISTORY_FIELDS.TYPE,
          VERSION_HISTORY_FIELDS.VALUE,
        ],
      });
      OrderLines.closeVersionHistory();

      cy.log('Step 37. Select the current fiscal year and verify one-year warning state');
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.selectStartingFiscalYear(futureFiscalYear.code);
      OrderLineEditForm.assertPrepaymentTermValue(1);
      OrderLineEditForm.assertAtLeastTwoFYsValidationError();
      OrderLineEditForm.assertFiscalYearCards([futureFiscalYear.code]);
      OrderLineEditForm.assertAddFiscalYearButtonDisabled();

      cy.log('Step 38. Cancel and discard the one-year change');
      OrderLineEditForm.cancelWithUnsavedChanges({ waitMs: 0 });

      cy.log('Step 39. Add another PO line');
      OrderLineDetails.backToOrderDetails();
      Orders.createPOLineViaActions({ waitMs: 0 });
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.toggleMultiYearPrepayment();

      cy.log('Step 40. Verify the new PO line fiscal-year options');
      OrderLineEditForm.toggleStartingFiscalYearDropdown();
      OrderLineEditForm.assertFiscalYearOptionPresent(futureFiscalYear.code);
      OrderLineEditForm.assertFiscalYearOptionAbsent(fyCurrent.code);
      OrderLineEditForm.assertFiscalYearOptionAbsent(fyPrevious.code);
    },
  );
});
