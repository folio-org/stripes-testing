import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import { DateTools, ExecutionFlowManager, NumberTools } from '../../../support/utils';
import { BUDGET_STATUSES } from '../../../support/constants/finance/budget';
import { FUND_DISTRIBUTION_TYPES, FUND_STATUSES } from '../../../support/constants/finance/fund';
import { LEDGER_STATUSES } from '../../../support/constants/finance/ledger';
import { ORDER_TYPES } from '../../../support/constants/orders/order';
import { ORDER_FORMAT_VALUES } from '../../../support/constants/orders/order-line';
import {
  APPLICATION_NAMES,
  ORDER_TEMPLATE_FORM_ACCORDION_LABELS,
} from '../../../support/constants';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import { ExpenseClasses } from '../../../support/fragments/settings/finance';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../../support/fragments/orders/orderLineDetails';
import OrderLineEditFormFragment from '../../../support/fragments/orders/orderLineEditForm';
import MultiYearPaymentTerms from '../../../support/fragments/orders/multiYearPaymentTerms';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import OrderTemplateFormFragment from '../../../support/fragments/settings/orders/orderTemplateForm';

import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { FinanceHelper } from '../../../support/fragments/finance';
import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import { RECEIVING_WORKFLOWS } from '../../../support/fragments/orders/basicOrderLine';

const OrderLineEditForm = { ...OrderLineEditFormFragment, ...MultiYearPaymentTerms };
const OrderTemplateForm = { ...OrderTemplateFormFragment, ...MultiYearPaymentTerms };

// Use the Node task so progress is visible in the Jenkins console.
const trace = (message) => cy.task('log', `[C1395029] ${message}`);

const fillPolRequiredFields = ({ form, title, acquisitionMethod }) => {
  trace('form.fillItemDetailsTitle [site 1]');
  form.fillItemDetailsTitle({ instanceTitle: title });
  trace('form.fillPoLineDetails [site 2]');
  form.fillPoLineDetails({
    acquisitionMethod,
    orderFormat: ORDER_FORMAT_VALUES.OTHER,
    receivingWorkflow: RECEIVING_WORKFLOWS.SYNCHRONIZED,
  });
  trace('form.fillCostDetails [site 3]');
  form.fillCostDetails({ physicalUnitPrice: '0', quantityPhysical: '1' });
};

const createOrderFromTemplate = ({ templateName, resourceKey, flow }) => {
  trace('Orders.createOrderByTemplateAndCapture [site 4]');
  return Orders.createOrderByTemplateAndCapture(templateName).then((order) => {
    flow.set(resourceKey, order, () => {
      trace('Orders.deleteOrderViaApi [site 5]');
      return Orders.deleteOrderViaApi(order.id, false);
    });
  });
};

const assertConfiguredPaymentTerms = (
  { form, fiscalYearCodes, fy2, fy3, fy4, fundB, fundA },
  { required = false } = {},
) => {
  trace('form.assertMultiYearPrepaymentChecked [site 6]');
  form.assertMultiYearPrepaymentChecked();
  trace('form.assertStartingFiscalYearValue [site 7]');
  form.assertStartingFiscalYearValue(fy2.code);
  trace('form.assertPrepaymentTermValue [site 8]');
  form.assertPrepaymentTermValue(3);
  trace('form.assertFiscalYearCards [site 9]');
  form.assertFiscalYearCards(fiscalYearCodes);
  trace('form.assertOnlyFiscalYearCardRemovable [site 10]');
  form.assertOnlyFiscalYearCardRemovable(fiscalYearCodes, fy4.code);

  trace('form.assertFiscalYearCardFundDistributions [site 11]');
  form.assertFiscalYearCardFundDistributions(
    {
      fyCode: fy2.code,
      distributions: [],
    },
    { required },
  );
  trace('form.assertFiscalYearCardFundDistributions [site 12]');
  form.assertFiscalYearCardFundDistributions(
    {
      fyCode: fy3.code,
      distributions: [
        {
          fundName: fundB.name,
          fundCode: fundB.code,
          value: 0,
          distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
        },
      ],
    },
    { required },
  );
  trace('form.assertFiscalYearCardFundDistributions [site 13]');
  form.assertFiscalYearCardFundDistributions(
    {
      fyCode: fy4.code,
      distributions: [
        {
          fundName: fundA.name,
          fundCode: fundA.code,
          value: 100,
          distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
        },
      ],
    },
    { required },
  );
  trace('form.assertDistributionTypePercentInFYCard [site 14]');
  form.assertDistributionTypePercentInFYCard({ fyCode: fy4.code });
  trace('form.assertAddFiscalYearButtonDisabled [site 15]');
  form.assertAddFiscalYearButtonDisabled();
};

const assertCompletedPaymentTerms = ({
  form,
  fiscalYearCodes,
  fy2,
  fy3,
  fy4,
  fundA,
  fundB,
  expenseClass1,
}) => {
  trace('form.assertMultiYearPrepaymentCheckedAndEnabled [site 16]');
  form.assertMultiYearPrepaymentCheckedAndEnabled();
  trace('form.assertStartingFiscalYearValue [site 17]');
  form.assertStartingFiscalYearValue(fy2.code);
  trace('form.assertPrepaymentTermValue [site 18]');
  form.assertPrepaymentTermValue(3);
  trace('form.assertFiscalYearCards [site 19]');
  form.assertFiscalYearCards(fiscalYearCodes);
  trace('form.assertOnlyFiscalYearCardRemovable [site 20]');
  form.assertOnlyFiscalYearCardRemovable(fiscalYearCodes, fy4.code);
  trace('form.assertFiscalYearCardFundDistributions [site 21]');
  form.assertFiscalYearCardFundDistributions({
    fyCode: fy2.code,
    distributions: [
      {
        fundName: fundA.name,
        fundCode: fundA.code,
        expenseClassName: expenseClass1.name,
        value: 25,
        distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
      },
      {
        fundName: fundB.name,
        fundCode: fundB.code,
        value: 250,
        distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
      },
    ],
  });
  trace('form.assertDistributionTypePercentInFYCard [site 22]');
  form.assertDistributionTypePercentInFYCard({ fyCode: fy2.code });
  trace('form.assertFiscalYearCardFundDistributions [site 23]');
  form.assertFiscalYearCardFundDistributions({
    fyCode: fy3.code,
    distributions: [
      {
        fundName: fundB.name,
        fundCode: fundB.code,
        value: 300,
        distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
      },
    ],
  });
  trace('form.assertFiscalYearCardFundDistributions [site 24]');
  form.assertFiscalYearCardFundDistributions({
    fyCode: fy4.code,
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
        value: 200,
        distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
      },
    ],
  });
  trace('form.assertDistributionTypePercentInFYCard [site 25]');
  form.assertDistributionTypePercentInFYCard({ fyCode: fy4.code });
};

const triggerFundDistributionValidation = (form) => {
  trace('form.scrollToPaymentTermsSection [site 26]');
  form.scrollToPaymentTermsSection();
  trace('cy.wait [site 27]');
  cy.wait('@validateFundDistributions');
};

// Temporarily enabled to diagnose the pipeline freeze using terminal progress markers.
describe('Settings | Orders', () => {
  const flow = new ExecutionFlowManager();

  const R = {
    FY1: 'fy1',
    FY2: 'fy2',
    FY3: 'fy3',
    FY4: 'fy4',
    LEDGER: 'ledger',
    FUND_A: 'fundA',
    FUND_B: 'fundB',
    EXPENSE_CLASS_1: 'expenseClass1',
    EXPENSE_CLASS_2: 'expenseClass2',
    BUDGET_A: 'budgetA',
    BUDGET_B: 'budgetB',
    ORG: 'org',
    ACQ_METHOD: 'acqMethod',
    USER: 'user',
    LOCALE: 'locale',
    TEMPLATE_1: 'template1',
    TEMPLATE_2: 'template2',
    ORDER_1: 'order1',
    ORDER_2: 'order2',
  };

  const fiscalYearSeries = getRandomStringCode(5);
  const currentYear = new Date().getFullYear();

  const testData = {
    acqMethodName: `AT_ACQ_METHOD_${getRandomPostfix()}`,
    template1Name: `AT_Template1_${getRandomPostfix()}`,
    template1Code: `T1${getRandomPostfix()}`,
    polTitle1: `AT_POL1_${getRandomPostfix()}`,
    polTitle2: `AT_POL2_${getRandomPostfix()}`,
    expenseClass1Name: `Electronic_${getRandomPostfix()}`,
    expenseClass2Name: `Print_${getRandomPostfix()}`,
  };

  const buildFiscalYear = (yearOffset) => ({
    ...FiscalYears.getDefaultFiscalYear(),
    ...DateTools.getFullFiscalYearStartAndEnd(yearOffset),
    code: `${fiscalYearSeries}${currentYear + yearOffset}`,
    series: fiscalYearSeries,
  });

  const createFundStep = (resourceKey) => (f) => {
    trace(`SETUP: create ${resourceKey}`);
    const { ledger } = f.ctx();

    trace('Funds.createViaApi [site 28]');
    return Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: ledger.id,
      fundStatus: FUND_STATUSES.ACTIVE,
      name: `AT_FUND_${resourceKey}_${getRandomPostfix()}`,
    }).then(({ fund }) => {
      f.set(resourceKey, fund, () => {
        trace('Funds.deleteFundViaApi [site 29]');
        return Funds.deleteFundViaApi(fund.id, false);
      });
    });
  };

  const createExpenseClassStep = (resourceKey, name) => (f) => {
    trace(`SETUP: create ${resourceKey}`);
    trace('ExpenseClasses.createExpenseClassViaApi [site 30]');
    return ExpenseClasses.createExpenseClassViaApi({
      ...ExpenseClasses.getDefaultExpenseClass(),
      name,
    }).then((expenseClass) => {
      f.set(resourceKey, expenseClass, () => {
        trace('ExpenseClasses.deleteExpenseClassViaApi [site 31]');
        return ExpenseClasses.deleteExpenseClassViaApi(expenseClass.id, {
          failOnStatusCode: false,
        });
      });
    });
  };

  const deleteBudgetWithExpenseClasses = (budgetId) => {
    trace('Budgets.getBudgetByIdViaApi [site 32]');
    return Budgets.getBudgetByIdViaApi(budgetId).then((budget) => {
      trace('Budgets.updateBudgetViaApi [site 33]');
      return Budgets.updateBudgetViaApi({ ...budget, statusExpenseClasses: [] }).then(() => {
        trace('Budgets.deleteViaApi [site 34]');
        return Budgets.deleteViaApi(budgetId, false);
      });
    });
  };

  before(() => {
    trace('SETUP: start');
    trace('SETUP: authenticate admin');
    trace('cy.getAdminToken [site 35]');
    cy.getAdminToken();
    trace('SETUP: clear local storage');
    trace('cy.clearLocalStorage [site 36]');
    cy.clearLocalStorage();

    trace('SETUP: get tenant locale');
    trace('cy.getTenantLocaleApi [site 37]');
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      // Precondition 1: Previous fiscal year (FY #1) with the shared alphabetical part
      .step((f) => {
        trace('SETUP: create previous fiscal year');
        trace('FiscalYears.createViaApi [site 38]');
        return FiscalYears.createViaApi(buildFiscalYear(-1)).then((fy1) => {
          f.set(R.FY1, fy1, () => {
            trace('FiscalYears.deleteFiscalYearViaApi [site 39]');
            return FiscalYears.deleteFiscalYearViaApi(fy1.id, false);
          });
        });
      })
      // Precondition 1: Current fiscal year (FY #2) whose period includes the current date
      .step((f) => {
        trace('SETUP: create current fiscal year');
        trace('FiscalYears.createViaApi [site 40]');
        return FiscalYears.createViaApi(buildFiscalYear(0)).then((fy2) => {
          f.set(R.FY2, fy2, () => {
            trace('FiscalYears.deleteFiscalYearViaApi [site 41]');
            return FiscalYears.deleteFiscalYearViaApi(fy2.id, false);
          });
        });
      })
      // Precondition 1: First future fiscal year (FY #3)
      .step((f) => {
        trace('SETUP: create first future fiscal year');
        trace('FiscalYears.createViaApi [site 42]');
        return FiscalYears.createViaApi(buildFiscalYear(1)).then((fy3) => {
          f.set(R.FY3, fy3, () => {
            trace('FiscalYears.deleteFiscalYearViaApi [site 43]');
            return FiscalYears.deleteFiscalYearViaApi(fy3.id, false);
          });
        });
      })
      // Precondition 1: Second future fiscal year (FY #4)
      .step((f) => {
        trace('SETUP: create second future fiscal year');
        trace('FiscalYears.createViaApi [site 44]');
        return FiscalYears.createViaApi(buildFiscalYear(2)).then((fy4) => {
          f.set(R.FY4, fy4, () => {
            trace('FiscalYears.deleteFiscalYearViaApi [site 45]');
            return FiscalYears.deleteFiscalYearViaApi(fy4.id, false);
          });
        });
      })
      // Precondition 2: Active Ledger related to the created Fiscal year #1
      .step((f) => {
        trace('SETUP: create ledger');
        const { fy1 } = f.ctx();
        trace('Ledgers.createViaApi [site 46]');
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fy1.id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => {
            trace('Ledgers.deleteLedgerViaApi [site 47]');
            return Ledgers.deleteLedgerViaApi(ledger.id, false);
          });
        });
      })
      // Precondition 3: Active Fund A related to the created Ledger
      .step(createFundStep(R.FUND_A))
      // Precondition 3: Active Fund B related to the created Ledger
      .step(createFundStep(R.FUND_B))
      // Precondition 3: Expense class #1 ("Electronic") for Fund A's current budget
      .step(createExpenseClassStep(R.EXPENSE_CLASS_1, testData.expenseClass1Name))
      // Precondition 3: Expense class #2 ("Print") for Fund A's current budget
      .step(createExpenseClassStep(R.EXPENSE_CLASS_2, testData.expenseClass2Name))
      // Precondition 3: Fund A current budget ($1000) with both expense classes activated
      .step((f) => {
        trace('SETUP: create fund A budget and activate expense classes');
        const { fundA, fy2, expenseClass1, expenseClass2 } = f.ctx();
        trace('Budgets.createViaApi [site 48]');
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy2.id,
          fundId: fundA.id,
          allocated: 1000,
          budgetStatus: BUDGET_STATUSES.ACTIVE,
        }).then((budget) => {
          trace('Budgets.updateBudgetViaApi [site 49]');
          return Budgets.updateBudgetViaApi({
            ...budget,
            statusExpenseClasses: [
              { status: BUDGET_STATUSES.ACTIVE, expenseClassId: expenseClass1.id },
              { status: BUDGET_STATUSES.ACTIVE, expenseClassId: expenseClass2.id },
            ],
          }).then(() => {
            f.set(R.BUDGET_A, budget, () => {
              trace('deleteBudgetWithExpenseClasses [site 50]');
              return deleteBudgetWithExpenseClasses(budget.id);
            });
          });
        });
      })
      // Precondition 3: Fund B current budget ($1000)
      .step((f) => {
        trace('SETUP: create fund B budget');
        const { fundB, fy2 } = f.ctx();
        trace('Budgets.createViaApi [site 51]');
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy2.id,
          fundId: fundB.id,
          allocated: 1000,
          budgetStatus: BUDGET_STATUSES.ACTIVE,
        }).then((budget) => {
          f.set(R.BUDGET_B, budget, () => {
            trace('Budgets.deleteViaApi [site 52]');
            return Budgets.deleteViaApi(budget.id, false);
          });
        });
      })
      // Supporting data: Organization (vendor) used by the order templates
      .step((f) => {
        trace('SETUP: create vendor organization');
        trace('NewOrganization.createViaApi [site 53]');
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
          (org) => {
            f.set(R.ORG, org, () => {
              trace('Organizations.deleteOrganizationViaApi [site 54]');
              return Organizations.deleteOrganizationViaApi(org.id);
            });
          },
        );
      })
      // Supporting data: Acquisition method used when filling the PO lines
      .step((f) => {
        trace('SETUP: create acquisition method');
        trace('cy.createAcquisitionMethodApi [site 55]');
        return cy.createAcquisitionMethodApi({ value: testData.acqMethodName }).then(({ body }) => f.set(R.ACQ_METHOD, body, () => {
          trace('cy.deleteAcquisitionMethodApi [site 56]');
          return cy.deleteAcquisitionMethodApi(body.id);
        }));
      })
      .step((f) => {
        trace('SETUP: create inventory instances');
        trace('cy.wrap [site 57]');
        cy.wrap([testData.polTitle1, testData.polTitle2]).each((title) => {
          trace(`SETUP: create inventory instance ${title}`);
          trace('cy.getInstanceTypes [site 58]');
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              trace('InventoryInstances.createFolioInstanceViaApi [site 59]');
              return InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title,
                  instanceTypeId: instanceTypes[0].id,
                },
              });
            })
            .then((instance) => f.toCleanup(title, () => {
              trace('InventoryInstance.deleteInstanceViaApi [site 60]');
              return InventoryInstance.deleteInstanceViaApi(instance.instanceId);
            }));
        });
      })
      // Precondition 4: Authorized user with the following capability sets:
      //   data - UI-Orders Orders - edit, create
      //   settings - UI-Orders Settings Order-Templates - create
      .step((f) => {
        trace('SETUP: create test user');
        trace('cy.createTempUser [site 61]');
        return cy
          .createTempUser([
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui,
          ])
          .then((userProperties) => {
            f.set(R.USER, userProperties, () => {
              trace('Users.deleteViaApi [site 62]');
              return Users.deleteViaApi(userProperties.userId);
            });
          });
      })
      // Precondition 5: A user is in "Settings" -> "Orders" -> "Order templates"
      .step((f) => {
        trace('SETUP: log in as test user');
        const { user } = f.ctx();

        trace('cy.login [site 63]');
        cy.login(user.username, user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        trace('SETUP: open order templates');
        trace('SettingOrdersNavigationMenu.selectOrderTemplates [site 64]');
        SettingOrdersNavigationMenu.selectOrderTemplates();
        trace('OrderTemplates.waitLoading [site 65]');
        OrderTemplates.waitLoading();
      });
    trace('SETUP: complete');
  });

  after(() => {
    trace('CLEANUP: start');
    trace('CLEANUP: authenticate admin');
    trace('cy.getAdminToken [site 66]');
    cy.getAdminToken();
    trace('CLEANUP: delete registered resources');
    flow.cleanup();
    trace('CLEANUP: complete');
  });

  it(
    'C1395029 Create an order from the template with three-year prepayment term (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C1395029Broken'] },
    () => {
      trace('TEST: start');
      const { fy1, fy2, fy3, fy4, fundA, fundB, org, acqMethod, expenseClass1, locale } =
        flow.ctx();
      const fiscalYearCodes = [fy2.code, fy3.code, fy4.code];
      const formatAmount = (value) => NumberTools.formatCurrency(value, locale);
      const comparableTemplate = (template) => Cypress._.omit(template, ['id', 'templateName', 'metadata']);

      trace('cy.intercept [site 67]');
      cy.intercept('PUT', '**/orders/order-lines/fund-distributions/validate').as(
        'validateFundDistributions',
      );

      trace('Step 1. Click "New" button on the "Order templates" pane');
      trace('OrderTemplates.clickNewOrderTemplateButton [site 68]');
      OrderTemplates.clickNewOrderTemplateButton();
      trace('OrderTemplateForm.waitLoading [site 69]');
      OrderTemplateForm.waitLoading();
      // Expected: "POL Ongoing order information" and "Payment terms" accordions are NOT displayed
      trace('OrderTemplateForm.assertPolOngoingOrderSectionAbsent [site 70]');
      OrderTemplateForm.assertPolOngoingOrderSectionAbsent();
      trace('OrderTemplateForm.assertPaymentTermsSectionAbsent [site 71]');
      OrderTemplateForm.assertPaymentTermsSectionAbsent();

      trace('Step 2. Select "Ongoing" option in the "Order type" field');
      trace('OrderTemplateForm.fillPoInfoSectionFields [site 72]');
      OrderTemplateForm.fillPoInfoSectionFields({
        organizationName: org.name,
        orderType: ORDER_TYPES.ONGOING,
      });
      // Expected: Ongoing accordions appear; unchecked "Multi-year prepayment" checkbox with (i);
      // "Payment terms" accordion is displayed and collapsed by default
      trace('OrderTemplateForm.assertPolOngoingOrderSectionPresent [site 73]');
      OrderTemplateForm.assertPolOngoingOrderSectionPresent();
      trace('OrderTemplateForm.assertPaymentTermsSectionPresent [site 74]');
      OrderTemplateForm.assertPaymentTermsSectionPresent();
      trace('OrderTemplateForm.assertMultiYearPrepaymentUnchecked [site 75]');
      OrderTemplateForm.assertMultiYearPrepaymentUnchecked();
      trace('OrderTemplateForm.assertPaymentTermsCollapsed [site 76]');
      OrderTemplateForm.assertPaymentTermsCollapsed();

      trace('Step 3. Click on the (i) icon next to the "Multi-year prepayment" checkbox');
      trace('OrderTemplateForm.expandAccordion [site 77]');
      OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.POL_ONGOING_INFO);
      trace('OrderTemplateForm.clickMultiYearPrepaymentInfoIcon [site 78]');
      OrderTemplateForm.clickMultiYearPrepaymentInfoIcon();
      trace('OrderTemplateForm.verifyMultiYearPrepaymentInfoPopover [site 79]');
      OrderTemplateForm.verifyMultiYearPrepaymentInfoPopover();
      trace('OrderTemplateForm.clickMultiYearPrepaymentInfoIcon [site 80]');
      OrderTemplateForm.clickMultiYearPrepaymentInfoIcon();

      trace('Step 4. Click on the (i) icon next to the "Payment terms" accordion');
      trace('OrderTemplateForm.clickPaymentTermsInfoIcon [site 81]');
      OrderTemplateForm.clickPaymentTermsInfoIcon();
      trace('OrderTemplateForm.verifyPaymentTermsInfoPopover [site 82]');
      OrderTemplateForm.verifyPaymentTermsInfoPopover();
      trace('OrderTemplateForm.clickPaymentTermsInfoIcon [site 83]');
      OrderTemplateForm.clickPaymentTermsInfoIcon();

      trace('Step 5. Check "Multi-year prepayment" checkbox');
      trace('OrderTemplateForm.toggleMultiYearPrepayment [site 84]');
      OrderTemplateForm.toggleMultiYearPrepayment();

      // Expected: checkbox checked; Payment terms active/expanded with blank Total price,
      // disabled blank Prepayment term, blank Starting fiscal year, "Remaining amount ... $0.00"
      trace('OrderTemplateForm.assertMultiYearPrepaymentChecked [site 85]');
      OrderTemplateForm.assertMultiYearPrepaymentChecked();
      trace('OrderTemplateForm.assertPaymentTermsExpanded [site 86]');
      OrderTemplateForm.assertPaymentTermsExpanded();
      trace('OrderTemplateForm.assertPrepaymentTermsRemainingAmount [site 87]');
      OrderTemplateForm.assertPrepaymentTermsRemainingAmount(formatAmount(0));
      trace('OrderTemplateForm.assertPaymentTermsState [site 88]');
      OrderTemplateForm.assertPaymentTermsState();

      trace('Step 6. Expand "Starting fiscal year" dropdown in the "Payment terms" accordion');
      trace('OrderTemplateForm.toggleStartingFiscalYearDropdown [site 89]');
      OrderTemplateForm.toggleStartingFiscalYearDropdown();
      // Expected: only current and future fiscal years are displayed; previous FY is NOT displayed
      trace('OrderTemplateForm.assertFiscalYearOptionPresent [site 90]');
      OrderTemplateForm.assertFiscalYearOptionPresent(fy2.code);
      trace('OrderTemplateForm.assertFiscalYearOptionPresent [site 91]');
      OrderTemplateForm.assertFiscalYearOptionPresent(fy3.code);
      trace('OrderTemplateForm.assertFiscalYearOptionPresent [site 92]');
      OrderTemplateForm.assertFiscalYearOptionPresent(fy4.code);
      trace('OrderTemplateForm.assertFiscalYearOptionAbsent [site 93]');
      OrderTemplateForm.assertFiscalYearOptionAbsent(fy1.code);
      trace('OrderTemplateForm.toggleStartingFiscalYearDropdown [site 94]');
      OrderTemplateForm.toggleStartingFiscalYearDropdown();

      trace('Step 7. Click (i) icon next to the "Starting fiscal year" dropdown');
      trace('OrderTemplateForm.clickStartingFiscalYearInfoIcon [site 95]');
      OrderTemplateForm.clickStartingFiscalYearInfoIcon();
      trace('OrderTemplateForm.verifyStartingFiscalYearInfoPopover [site 96]');
      OrderTemplateForm.verifyStartingFiscalYearInfoPopover();

      trace('Step 8. Select the current FY in the dropdown');
      trace('OrderTemplateForm.selectStartingFiscalYear [site 97]');
      OrderTemplateForm.selectStartingFiscalYear(fy2.code, { trace });
      // Expected: 2 cards (FY #2, FY #3); Prepayment term = 2; trash only on FY #3 card; Add FY active
      trace('Step 8: verify current fiscal year card');
      trace('OrderTemplateForm.assertFiscalYearCards [site 98]');
      OrderTemplateForm.assertFiscalYearCards([fy2.code]);
      trace('Step 8: verify first future fiscal year card');
      trace('OrderTemplateForm.assertFiscalYearCards [site 99]');
      OrderTemplateForm.assertFiscalYearCards([fy3.code]);
      trace('Step 8: verify prepayment term is 2');
      trace('OrderTemplateForm.assertPrepaymentTermValue [site 100]');
      OrderTemplateForm.assertPrepaymentTermValue(2);
      trace('Step 8: verify only the future fiscal year card is removable');
      trace('OrderTemplateForm.assertOnlyFiscalYearCardRemovable [site 101]');
      OrderTemplateForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      trace('Step 8: verify Add fiscal year is enabled');
      trace('OrderTemplateForm.assertAddFiscalYearButtonEnabled [site 102]');
      OrderTemplateForm.assertAddFiscalYearButtonEnabled();

      trace('Step 9. Click "Add fiscal year" button');
      trace('OrderTemplateForm.clickAddFiscalYearButton [site 103]');
      OrderTemplateForm.clickAddFiscalYearButton();
      // Expected: 3 cards (FY #2, FY #3, FY #4); Prepayment term = 3; trash only on FY #4 card; Add FY inactive
      trace('OrderTemplateForm.assertFiscalYearCards [site 104]');
      OrderTemplateForm.assertFiscalYearCards([fy2.code, fy3.code, fy4.code]);
      trace('OrderTemplateForm.assertPrepaymentTermValue [site 105]');
      OrderTemplateForm.assertPrepaymentTermValue(3);
      trace('OrderTemplateForm.assertOnlyFiscalYearCardRemovable [site 106]');
      OrderTemplateForm.assertOnlyFiscalYearCardRemovable(fiscalYearCodes, fy4.code);
      trace('OrderTemplateForm.assertAddFiscalYearButtonDisabled [site 107]');
      OrderTemplateForm.assertAddFiscalYearButtonDisabled();

      trace('Step 10. Click "Add fund distribution" button in the Fiscal year 1 card (current FY)');
      trace('OrderTemplateForm.addFundDistributionInFYCard [site 108]');
      OrderTemplateForm.addFundDistributionInFYCard(fy2.code);
      // Expected: not-required Fund ID / Value / Type (currency default) / Amount / Trash fields appear
      trace('OrderTemplateForm.assertEmptyFundDistributionRow [site 109]');
      OrderTemplateForm.assertEmptyFundDistributionRow({ fyCode: fy2.code });

      trace('Step 11. Select Fund A in the "Fund ID" dropdown');
      trace('OrderTemplateForm.selectFundInPaymentTermsCard [site 110]');
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      // Expected: Fund A selected; "Expense class" not-required field appears in the Fiscal year 1 card
      trace('OrderTemplateForm.assertFiscalYearCardFundDistributions [site 111]');
      OrderTemplateForm.assertFiscalYearCardFundDistributions(
        {
          fyCode: fy2.code,
          distributions: [
            {
              expenseClassName: '',
              fundName: fundA.name,
              fundCode: fundA.code,
              value: 0,
              distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            },
          ],
        },
        { required: false },
      );
      trace('OrderTemplateForm.assertExpenseClassFieldPresentInFYCard [site 112]');
      OrderTemplateForm.assertExpenseClassFieldPresentInFYCard(fy2.code);

      trace('Step 12. Click trash icon next to the Fund row in the Fiscal year 1 card');
      trace('OrderTemplateForm.removeFundDistributionInFYCard [site 113]');
      OrderTemplateForm.removeFundDistributionInFYCard({ fyCode: fy2.code });
      // Expected: fund distribution removed; only active "Add fund distribution" button remains
      trace('OrderTemplateForm.assertFundDistributionAbsentInFYCard [site 114]');
      OrderTemplateForm.assertFundDistributionAbsentInFYCard(fy2.code);

      trace(
        'Step 13. Add fund distribution in the Fiscal year 3 card; Select Fund A; Select % toggle',
      );
      trace('OrderTemplateForm.addFundDistributionInFYCard [site 115]');
      OrderTemplateForm.addFundDistributionInFYCard(fy4.code);
      trace('OrderTemplateForm.selectFundInPaymentTermsCard [site 116]');
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('OrderTemplateForm.selectDistributionTypePercentInFYCard [site 117]');
      OrderTemplateForm.selectDistributionTypePercentInFYCard({ fyCode: fy4.code });
      // Expected: Fund A is selected in the Fiscal year 3 card
      trace('OrderTemplateForm.assertFiscalYearCardFundDistributions [site 118]');
      OrderTemplateForm.assertFiscalYearCardFundDistributions(
        {
          fyCode: fy4.code,
          distributions: [
            {
              fundName: fundA.name,
              fundCode: fundA.code,
              value: 100,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
            },
          ],
        },
        { required: false },
      );
      trace('OrderTemplateForm.assertDistributionTypePercentInFYCard [site 119]');
      OrderTemplateForm.assertDistributionTypePercentInFYCard({ fyCode: fy4.code });

      trace('Step 14. Add fund distribution in the Fiscal year 2 card; Select Fund B');
      trace('OrderTemplateForm.addFundDistributionInFYCard [site 120]');
      OrderTemplateForm.addFundDistributionInFYCard(fy3.code);
      trace('OrderTemplateForm.selectFundInPaymentTermsCard [site 121]');
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundB.name,
        fundCode: fundB.code,
      });
      // Expected: Fund B is selected in the Fiscal year 2 card
      trace('OrderTemplateForm.assertFiscalYearCardFundDistributions [site 122]');
      OrderTemplateForm.assertFiscalYearCardFundDistributions(
        {
          fyCode: fy3.code,
          distributions: [
            {
              fundName: fundB.name,
              fundCode: fundB.code,
              value: 0,
              distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
            },
          ],
        },
        { required: false },
      );

      trace(
        'Step 15. Fill in the "Name" field; Select USD in the "Currency" dropdown; Click "Save"',
      );
      trace('cy.intercept [site 123]');
      cy.intercept('POST', '**/orders/order-templates').as('template1Created');
      trace('OrderTemplateForm.expandAccordion [site 124]');
      OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.COST_DETAILS);
      trace('OrderTemplateForm.fillInfoSectionFields [site 125]');
      OrderTemplateForm.fillInfoSectionFields({
        templateName: testData.template1Name,
        templateCode: testData.template1Code,
      });
      trace('OrderTemplateForm.selectCurrency [site 126]');
      OrderTemplateForm.selectCurrency('USD');
      trace('OrderTemplateForm.clickSaveButton [site 127]');
      OrderTemplateForm.clickSaveButton();
      // Expected: "Order templates" pane; toast "The template was saved"
      trace('cy.wait [site 128]');
      cy.wait('@template1Created').then(({ response }) => {
        flow.set(R.TEMPLATE_1, response.body, () => {
          trace('OrderTemplates.deleteOrderTemplateViaApi [site 129]');
          return OrderTemplates.deleteOrderTemplateViaApi(response.body.id, {
            failOnStatusCode: false,
          });
        });
      });
      trace('OrderTemplates.waitLoading [site 130]');
      OrderTemplates.waitLoading();

      trace('Step 16. Click on the just created order template; Click "Expand all" link');
      trace('OrderTemplates.selectTemplate [site 131]');
      OrderTemplates.selectTemplate(testData.template1Name);
      trace('OrderTemplates.expandAll [site 132]');
      OrderTemplates.expandAll();
      // Expected: Ongoing accordion shows checked Multi-year prepayment; Payment terms shows data for
      // the Fiscal year 2 and Fiscal year 3 cards; "The list contains no items" in the Fiscal year 1 card
      trace('OrderTemplates.assertMultiYearPrepaymentChecked [site 133]');
      OrderTemplates.assertMultiYearPrepaymentChecked();
      trace('OrderTemplates.assertPaymentTermsCardContainsFund [site 134]');
      OrderTemplates.assertPaymentTermsCardContainsFund(fy3.code, fundB.name);
      trace('OrderTemplates.assertPaymentTermsCardContainsFund [site 135]');
      OrderTemplates.assertPaymentTermsCardContainsFund(fy4.code, fundA.name);
      trace('OrderTemplates.assertPaymentTermsCardShowsNoItems [site 136]');
      OrderTemplates.assertPaymentTermsCardShowsNoItems(fy2.code);

      trace(
        'Step 17. Click "Actions" button; Select "Duplicate" option; Click "Submit" in the "Duplicate template" modal',
      );
      trace('cy.intercept [site 137]');
      cy.intercept('POST', '**/orders/order-templates').as('template2Created');
      trace('OrderTemplates.duplicateTemplate [site 138]');
      OrderTemplates.duplicateTemplate();
      // Expected: "<name> (Copy) - <MM/DD/YYYY, HH:MM:SS AM>" edit page; toast "The template was
      // successfully duplicated"; new template contains the same data
      trace('OrderTemplateForm.waitLoading [site 139]');
      OrderTemplateForm.waitLoading();

      trace('cy.wait [site 140]');
      cy.wait('@template2Created').then(({ response }) => {
        const duplicatedTemplate = response.body;

        flow.set(R.TEMPLATE_2, duplicatedTemplate, () => {
          trace('OrderTemplates.deleteOrderTemplateViaApi [site 141]');
          return OrderTemplates.deleteOrderTemplateViaApi(duplicatedTemplate.id, {
            failOnStatusCode: false,
          });
        });

        trace('ASSERT: verify template response');
        expect(duplicatedTemplate.templateName).to.match(
          new RegExp(`^${Cypress._.escapeRegExp(testData.template1Name)} \\(Copy\\) - `),
        );
        trace('ASSERT: verify template response');
        expect(comparableTemplate(duplicatedTemplate)).to.deep.equal(
          comparableTemplate(flow.get(R.TEMPLATE_1)),
        );

        trace('OrderTemplateForm.expandAll [site 142]');
        OrderTemplateForm.expandAll();
        trace('OrderTemplateForm.assertInfoSectionFields [site 143]');
        OrderTemplateForm.assertInfoSectionFields({
          templateName: duplicatedTemplate.templateName,
          templateCode: testData.template1Code,
        });

        trace('assertConfiguredPaymentTerms [site 144]');
        assertConfiguredPaymentTerms({
          form: OrderTemplateForm,
          fiscalYearCodes,
          fy2,
          fy3,
          fy4,
          fundA,
          fundB,
        });
      });

      trace(
        'Step 18. Click on the eye icon next to the "Multi-year prepayment" checkbox and "Payment terms" accordion; Click "Save"',
      );
      trace('OrderTemplateForm.fillPrepaymentTotalPrice [site 145]');
      OrderTemplateForm.fillPrepaymentTotalPrice(100);
      trace('OrderTemplateForm.fillFundDistributionValueInFYCard [site 146]');
      OrderTemplateForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 50,
      });
      trace('OrderTemplateForm.selectDistributionTypeAmountInFYCard [site 147]');
      OrderTemplateForm.selectDistributionTypeAmountInFYCard({ fyCode: fy4.code });
      trace('OrderTemplateForm.fillFundDistributionValueInFYCard [site 148]');
      OrderTemplateForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 50,
      });

      trace('OrderTemplateForm.toggleMultiYearPrepaymentVisibility [site 149]');
      OrderTemplateForm.toggleMultiYearPrepaymentVisibility();
      trace('OrderTemplateForm.togglePaymentTermsVisibility [site 150]');
      OrderTemplateForm.togglePaymentTermsVisibility();
      trace('OrderTemplateForm.clickSaveButton [site 151]');
      OrderTemplateForm.clickSaveButton();
      // Expected: "Order templates" pane; toast "The template was saved"
      trace('OrderTemplates.waitLoading [site 152]');
      OrderTemplates.waitLoading();

      trace(
        'Step 19. Navigate to "Orders" app; Select "Order" toggle; Click "New"; Select order template #2; Fill mandatory fields; Click "Save & close"',
      );
      trace('TopMenuNavigation.navigateToApp [site 153]');
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      trace('OrderLines.waitLoading [site 154]');
      OrderLines.waitLoading();
      trace('OrderLines.selectOrders [site 155]');
      OrderLines.selectOrders();

      // The duplicate name is generated by the server in step 17, so resolve it at execution time.
      trace('cy.then [site 156]');
      cy.then(() => {
        trace('createOrderFromTemplate [site 157]');
        return createOrderFromTemplate({
          templateName: `${flow.get(R.TEMPLATE_2).templateName} (${flow.get(R.TEMPLATE_2).templateCode})`,
          resourceKey: R.ORDER_2,
          flow,
        });
      });
      // Expected: "Purchase order" pane; toast "The Purchase order - number has been successfully saved"
      trace('OrderDetails.waitLoading [site 158]');
      OrderDetails.waitLoading();

      trace(
        'Step 20. Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      trace('OrderDetails.selectAddPOLine [site 159]');
      OrderDetails.selectAddPOLine();
      trace('OrderLineEditForm.waitLoading [site 160]');
      OrderLineEditForm.waitLoading();
      // Expected: "Multi-year prepayment" checkbox is NOT displayed; "Payment terms" accordion is NOT displayed
      trace('OrderLineEditForm.assertMultiYearPrepaymentAbsent [site 161]');
      OrderLineEditForm.assertMultiYearPrepaymentAbsent();
      trace('OrderLineEditForm.assertPaymentTermsSectionAbsent [site 162]');
      OrderLineEditForm.assertPaymentTermsSectionAbsent();

      trace('Step 21. Fill in all required fields; Click "Save & close" button');
      trace('fillPolRequiredFields [site 163]');
      fillPolRequiredFields({
        form: OrderLineEditForm,
        title: testData.polTitle2,
        acquisitionMethod: acqMethod.value,
      });
      trace('OrderLineEditForm.clickSaveButton [site 164]');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: "PO Line details" pane; toast "The purchase order line was successfully created";
      // Multi-year prepayment checkbox NOT displayed; "Payment terms" accordion NOT displayed
      trace('OrderLineDetails.waitLoading [site 165]');
      OrderLineDetails.waitLoading();
      trace('OrderLineDetails.assertMultiYearPrepaymentAbsent [site 166]');
      OrderLineDetails.assertMultiYearPrepaymentAbsent();
      trace('OrderLineDetails.assertPaymentTermsSectionAbsent [site 167]');
      OrderLineDetails.assertPaymentTermsSectionAbsent();

      trace(
        'Step 22. Click "New" button on the "Orders" pane; Select order template #1; Fill mandatory fields; Click "Save & close"',
      );
      trace('OrderLineDetails.backToOrderDetails [site 168]');
      OrderLineDetails.backToOrderDetails();
      trace('OrderDetails.closeOrderDetails [site 169]');
      OrderDetails.closeOrderDetails();
      trace('Orders.waitLoading [site 170]');
      Orders.waitLoading();
      trace('createOrderFromTemplate [site 171]');
      createOrderFromTemplate({
        templateName: `${testData.template1Name} (${testData.template1Code})`,
        resourceKey: R.ORDER_1,
        flow,
      });
      // Expected: "Purchase order" pane; toast "The Purchase order - number has been successfully saved"
      trace('OrderDetails.waitLoading [site 172]');
      OrderDetails.waitLoading();

      trace(
        'Step 23. Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      trace('OrderDetails.selectAddPOLine [site 173]');
      OrderDetails.selectAddPOLine();
      trace('OrderLineEditForm.waitLoading [site 174]');
      OrderLineEditForm.waitLoading();
      // Expected: checked "Multi-year prepayment" checkbox with (i) icon; active "Payment terms"
      // accordion shows the same data as configured in the template
      trace('OrderLineEditForm.assertPaymentTermsSectionPresent [site 175]');
      OrderLineEditForm.assertPaymentTermsSectionPresent();
      trace('assertConfiguredPaymentTerms [site 176]');
      assertConfiguredPaymentTerms(
        {
          form: OrderLineEditForm,
          fiscalYearCodes,
          fy2,
          fy3,
          fy4,
          fundA,
          fundB,
        },
        { required: true },
      );

      trace(
        'Step 24. Fill in all required fields; Do NOT fill "Fund distribution" and "Payment terms"; Click "Save & close"',
      );
      trace('fillPolRequiredFields [site 177]');
      fillPolRequiredFields({
        form: OrderLineEditForm,
        title: testData.polTitle1,
        acquisitionMethod: acqMethod.value,
      });
      trace('OrderLineEditForm.clickSaveButton [site 178]');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: false });
      trace('OrderLineEditForm.assertPaymentTermsMixTypesOfZeroPriceValidationError [site 179]');
      OrderLineEditForm.assertPaymentTermsMixTypesOfZeroPriceValidationError();

      trace(
        'Step 25. Fill "Total price" with 1500; Enter 300 in the Fiscal year 2 card (Fund B); Enter 25 in the Fiscal year 3 card (Fund A)',
      );
      trace('OrderLineEditForm.fillPrepaymentTotalPrice [site 180]');
      OrderLineEditForm.fillPrepaymentTotalPrice(1500);
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard [site 181]');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 300,
      });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard [site 182]');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 25,
      });
      trace('triggerFundDistributionValidation [site 183]');
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: red validation message and "Remaining amount to be distributed: $825.00"
      trace('OrderLineEditForm.assertPaymentTermsPercentageValidationError [site 184]');
      OrderLineEditForm.assertPaymentTermsPercentageValidationError();
      trace('OrderLineEditForm.assertPaymentTermsRemainingAmount [site 185]');
      OrderLineEditForm.assertPaymentTermsRemainingAmount(formatAmount(825));

      trace(
        'Step 26. Add fund distribution in the Fiscal year 1 card; Select Fund A; Select expense class #1; Select % toggle; Enter 25',
      );
      trace('OrderLineEditForm.addFundDistributionInFYCard [site 186]');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard [site 187]');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      trace('triggerFundDistributionValidation [site 188]');
      triggerFundDistributionValidation(OrderLineEditForm);
      trace('OrderLineEditForm.selectExpenseClassInFYCard [site 189]');
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: fy2.code,
        expenseClassName: expenseClass1.name,
      });
      trace('OrderLineEditForm.selectDistributionTypePercentInFYCard [site 190]');
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy2.code });
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard [site 191]');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 25,
      });
      trace('triggerFundDistributionValidation [site 192]');
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: red validation message and "Remaining amount to be distributed: $450.00"
      trace('OrderLineEditForm.assertPaymentTermsPercentageValidationError [site 193]');
      OrderLineEditForm.assertPaymentTermsPercentageValidationError();
      trace('OrderLineEditForm.assertPaymentTermsRemainingAmount [site 194]');
      OrderLineEditForm.assertPaymentTermsRemainingAmount(formatAmount(450));

      trace('Step 27. Add fund distribution in the Fiscal year 1 card; Select Fund B; Enter 250');
      trace('OrderLineEditForm.addFundDistributionInFYCard [site 195]');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard [site 196]');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      trace('triggerFundDistributionValidation [site 197]');
      triggerFundDistributionValidation(OrderLineEditForm);
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard [site 198]');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 250,
        rowIndex: 1,
      });
      trace('triggerFundDistributionValidation [site 199]');
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: red validation message and "Remaining amount to be distributed: $200.00"
      trace('OrderLineEditForm.assertPaymentTermsPercentageValidationError [site 200]');
      OrderLineEditForm.assertPaymentTermsPercentageValidationError();
      trace('OrderLineEditForm.assertPaymentTermsRemainingAmount [site 201]');
      OrderLineEditForm.assertPaymentTermsRemainingAmount(formatAmount(200));

      trace('Step 28. Add fund distribution in the Fiscal year 3 card; Select Fund A; Enter 200');
      trace('OrderLineEditForm.addFundDistributionInFYCard [site 202]');
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      trace('OrderLineEditForm.selectFundInPaymentTermsCard [site 203]');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 1,
      });
      trace('triggerFundDistributionValidation [site 204]');
      triggerFundDistributionValidation(OrderLineEditForm);
      trace('OrderLineEditForm.fillFundDistributionValueInFYCard [site 205]');
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 200,
        rowIndex: 1,
      });
      trace('triggerFundDistributionValidation [site 206]');
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: "You can not have multiple distributions for the same fund with the same expense class."
      trace('OrderLineEditForm.assertMultipleDistributionsSameFundError [site 207]');
      OrderLineEditForm.assertMultipleDistributionsSameFundError();

      trace('Step 29. Select Fund B instead of Fund A in the Fiscal year 3 card');
      trace('OrderLineEditForm.selectFundInPaymentTermsCard [site 208]');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      trace('triggerFundDistributionValidation [site 209]');
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: "Remaining amount to be distributed: $0.00"
      trace('OrderLineEditForm.assertPaymentTermsRemainingAmount [site 210]');
      OrderLineEditForm.assertPaymentTermsRemainingAmount(formatAmount(0));

      trace('Step 30. Click "Save & close" button');
      trace('OrderLineEditForm.clickSaveButton [site 211]');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: "PO Line details"; toast "The purchase order line was successfully created";
      // Ongoing accordion shows checked Multi-year prepayment; Fund distribution accordion blank;
      // Payment terms accordion shows three Fiscal year cards populated with the entered values
      trace('OrderLineDetails.waitLoading [site 212]');
      OrderLineDetails.waitLoading();
      trace('OrderLineDetails.assertMultiYearPrepaymentChecked [site 213]');
      OrderLineDetails.assertMultiYearPrepaymentChecked();
      trace('OrderLineDetails.assertFundDistributionAccordionBlank [site 214]');
      OrderLineDetails.assertFundDistributionAccordionBlank();
      trace('OrderLineDetails.assertPaymentTerms [site 215]');
      OrderLineDetails.assertPaymentTerms({
        totalPrice: formatAmount(1500),
        prepaymentTerm: 3,
        startingFiscalYear: fy2.code,
        distributions: [
          {
            fyCode: fy2.code,
            rows: [
              {
                fundName: fundA.name,
                expenseClass: expenseClass1.name,
                value: '25%',
                amount: formatAmount(375),
              },
              {
                fundName: fundB.name,
                value: '250',
                amount: formatAmount(250),
              },
            ],
          },
          {
            fyCode: fy3.code,
            rows: [
              {
                fundName: fundB.name,
                value: '300',
                amount: formatAmount(300),
              },
            ],
          },
          {
            fyCode: fy4.code,
            rows: [
              { fundName: fundA.name, value: '25%', amount: formatAmount(375) },
              { fundName: fundB.name, value: '200', amount: formatAmount(200) },
            ],
          },
        ],
      });

      trace('Step 31. Click "Actions" button; Select "Edit" option');
      trace('FinanceHelper.interceptGetFiscalYearsRequest [site 216]');
      FinanceHelper.interceptGetFiscalYearsRequest();
      trace('OrderLineDetails.openOrderLineEditForm [site 217]');
      OrderLineDetails.openOrderLineEditForm();
      trace('FinanceHelper.waitForGetFiscalYearsRequestCompletion [site 218]');
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();
      // Expected: "Edit PO line" page; Multi-year prepayment checkbox checked and enabled;
      // Fund distribution accordion blank; Payment terms accordion shows three populated Fiscal year cards
      trace('OrderLineEditForm.assertFundDistributionSectionEmpty [site 219]');
      OrderLineEditForm.assertFundDistributionSectionEmpty();
      trace('OrderLineEditForm.assertPaymentTermsSectionPresent [site 220]');
      OrderLineEditForm.assertPaymentTermsSectionPresent();
      trace('assertCompletedPaymentTerms [site 221]');
      assertCompletedPaymentTerms({
        form: OrderLineEditForm,
        fiscalYearCodes,
        fy2,
        fy3,
        fy4,
        fundA,
        fundB,
        expenseClass1,
      });
      trace('TEST: complete');
    },
  );
});
