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

const fillPolRequiredFields = ({ form, title, acquisitionMethod }) => {
  form.fillItemDetailsTitle({ instanceTitle: title });
  form.fillPoLineDetails({
    acquisitionMethod,
    orderFormat: ORDER_FORMAT_VALUES.OTHER,
    receivingWorkflow: RECEIVING_WORKFLOWS.SYNCHRONIZED,
  });
  form.fillCostDetails({ physicalUnitPrice: '0', quantityPhysical: '1' });
};

const createOrderFromTemplate = ({ templateName, resourceKey, flow }) => {
  return Orders.createOrderByTemplateAndCapture(templateName).then((order) => {
    flow.set(resourceKey, order, () => Orders.deleteOrderViaApi(order.id, false));
  });
};

const assertConfiguredPaymentTerms = (
  { form, fiscalYearCodes, fy2, fy3, fy4, fundB, fundA },
  { required = false } = {},
) => {
  form.assertMultiYearPrepaymentChecked();
  form.assertStartingFiscalYearValue(fy2.code);
  form.assertPrepaymentTermValue(3);
  form.assertFiscalYearCards(fiscalYearCodes);
  form.assertOnlyFiscalYearCardRemovable(fiscalYearCodes, fy4.code);

  form.assertFiscalYearCardFundDistributions(
    {
      fyCode: fy2.code,
      distributions: [],
    },
    { required },
  );
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
  form.assertDistributionTypePercentInFYCard({ fyCode: fy4.code });
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
  form.assertMultiYearPrepaymentCheckedAndEnabled();
  form.assertStartingFiscalYearValue(fy2.code);
  form.assertPrepaymentTermValue(3);
  form.assertFiscalYearCards(fiscalYearCodes);
  form.assertOnlyFiscalYearCardRemovable(fiscalYearCodes, fy4.code);
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
  form.assertDistributionTypePercentInFYCard({ fyCode: fy2.code });
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
  form.assertDistributionTypePercentInFYCard({ fyCode: fy4.code });
};

const triggerFundDistributionValidation = (form) => {
  form.scrollToPaymentTermsSection();
  cy.wait('@validateFundDistributions');
};

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
    const { ledger } = f.ctx();

    return Funds.createViaApi({
      ...Funds.getDefaultFund(),
      ledgerId: ledger.id,
      fundStatus: FUND_STATUSES.ACTIVE,
      name: `AT_FUND_${resourceKey}_${getRandomPostfix()}`,
    }).then(({ fund }) => {
      f.set(resourceKey, fund, () => Funds.deleteFundViaApi(fund.id, false));
    });
  };

  const createExpenseClassStep = (resourceKey, name) => (f) => {
    return ExpenseClasses.createExpenseClassViaApi({
      ...ExpenseClasses.getDefaultExpenseClass(),
      name,
    }).then((expenseClass) => {
      f.set(resourceKey, expenseClass, () => ExpenseClasses.deleteExpenseClassViaApi(expenseClass.id, { failOnStatusCode: false }));
    });
  };

  const deleteBudgetWithExpenseClasses = (budgetId) => {
    return Budgets.getBudgetByIdViaApi(budgetId).then((budget) => {
      return Budgets.updateBudgetViaApi({ ...budget, statusExpenseClasses: [] }).then(() => {
        return Budgets.deleteViaApi(budgetId, false);
      });
    });
  };

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      // Precondition 1: Previous fiscal year (FY #1) with the shared alphabetical part
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(-1)).then((fy1) => {
          f.set(R.FY1, fy1, () => FiscalYears.deleteFiscalYearViaApi(fy1.id, false));
        });
      })
      // Precondition 1: Current fiscal year (FY #2) whose period includes the current date
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(0)).then((fy2) => {
          f.set(R.FY2, fy2, () => FiscalYears.deleteFiscalYearViaApi(fy2.id, false));
        });
      })
      // Precondition 1: First future fiscal year (FY #3)
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(1)).then((fy3) => {
          f.set(R.FY3, fy3, () => FiscalYears.deleteFiscalYearViaApi(fy3.id, false));
        });
      })
      // Precondition 1: Second future fiscal year (FY #4)
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(2)).then((fy4) => {
          f.set(R.FY4, fy4, () => FiscalYears.deleteFiscalYearViaApi(fy4.id, false));
        });
      })
      // Precondition 2: Active Ledger related to the created Fiscal year #1
      .step((f) => {
        const { fy1 } = f.ctx();
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fy1.id,
          ledgerStatus: LEDGER_STATUSES.ACTIVE,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false));
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
        const { fundA, fy2, expenseClass1, expenseClass2 } = f.ctx();
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy2.id,
          fundId: fundA.id,
          allocated: 1000,
          budgetStatus: BUDGET_STATUSES.ACTIVE,
        }).then((budget) => {
          return Budgets.updateBudgetViaApi({
            ...budget,
            statusExpenseClasses: [
              { status: BUDGET_STATUSES.ACTIVE, expenseClassId: expenseClass1.id },
              { status: BUDGET_STATUSES.ACTIVE, expenseClassId: expenseClass2.id },
            ],
          }).then(() => {
            f.set(R.BUDGET_A, budget, () => deleteBudgetWithExpenseClasses(budget.id));
          });
        });
      })
      // Precondition 3: Fund B current budget ($1000)
      .step((f) => {
        const { fundB, fy2 } = f.ctx();
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy2.id,
          fundId: fundB.id,
          allocated: 1000,
          budgetStatus: BUDGET_STATUSES.ACTIVE,
        }).then((budget) => {
          f.set(R.BUDGET_B, budget, () => Budgets.deleteViaApi(budget.id, false));
        });
      })
      // Supporting data: Organization (vendor) used by the order templates
      .step((f) => {
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
          (org) => {
            f.set(R.ORG, org, () => Organizations.deleteOrganizationViaApi(org.id));
          },
        );
      })
      // Supporting data: Acquisition method used when filling the PO lines
      .step((f) => {
        return cy
          .createAcquisitionMethodApi({ value: testData.acqMethodName })
          .then(({ body }) => f.set(R.ACQ_METHOD, body, () => cy.deleteAcquisitionMethodApi(body.id)));
      })
      .step((f) => {
        cy.wrap([testData.polTitle1, testData.polTitle2]).each((title) => {
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypes) => {
              return InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title,
                  instanceTypeId: instanceTypes[0].id,
                },
              });
            })
            .then((instance) => f.toCleanup(title, () => InventoryInstance.deleteInstanceViaApi(instance.instanceId)));
        });
      })
      // Precondition 4: Authorized user with the following capability sets:
      //   data - UI-Orders Orders - edit, create
      //   settings - UI-Orders Settings Order-Templates - create
      .step((f) => {
        return cy
          .createTempUser([
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui,
          ])
          .then((userProperties) => {
            f.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
          });
      })
      // Precondition 5: A user is in "Settings" -> "Orders" -> "Order templates"
      .step((f) => {
        const { user } = f.ctx();

        cy.login(user.username, user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
      });
  });

  after(() => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1395029 Create an order from the template with three-year prepayment term (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C1395029'] },
    () => {
      const { fy1, fy2, fy3, fy4, fundA, fundB, org, acqMethod, expenseClass1, locale } =
        flow.ctx();
      const fiscalYearCodes = [fy2.code, fy3.code, fy4.code];
      const formatAmount = (value) => NumberTools.formatCurrency(value, locale);
      const comparableTemplate = (template) => Cypress._.omit(template, ['id', 'templateName', 'metadata']);

      cy.intercept('PUT', '**/orders/order-lines/fund-distributions/validate').as(
        'validateFundDistributions',
      );

      cy.log('Step 1. Click "New" button on the "Order templates" pane');
      OrderTemplates.clickNewOrderTemplateButton();
      OrderTemplateForm.waitLoading();
      // Expected: "POL Ongoing order information" and "Payment terms" accordions are NOT displayed
      OrderTemplateForm.assertPolOngoingOrderSectionAbsent();
      OrderTemplateForm.assertPaymentTermsSectionAbsent();

      cy.log('Step 2. Select "Ongoing" option in the "Order type" field');
      OrderTemplateForm.fillPoInfoSectionFields({
        organizationName: org.name,
        orderType: ORDER_TYPES.ONGOING,
      });
      // Expected: Ongoing accordions appear; unchecked "Multi-year prepayment" checkbox with (i);
      // "Payment terms" accordion is displayed and collapsed by default
      OrderTemplateForm.assertPolOngoingOrderSectionPresent();
      OrderTemplateForm.assertPaymentTermsSectionPresent();
      OrderTemplateForm.assertMultiYearPrepaymentUnchecked();
      OrderTemplateForm.assertPaymentTermsCollapsed();

      cy.log('Step 3. Click on the (i) icon next to the "Multi-year prepayment" checkbox');
      OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.POL_ONGOING_INFO);
      OrderTemplateForm.clickMultiYearPrepaymentInfoIcon();
      OrderTemplateForm.verifyMultiYearPrepaymentInfoPopover();
      OrderTemplateForm.clickMultiYearPrepaymentInfoIcon();

      cy.log('Step 4. Click on the (i) icon next to the "Payment terms" accordion');
      OrderTemplateForm.clickPaymentTermsInfoIcon();
      OrderTemplateForm.verifyPaymentTermsInfoPopover();
      OrderTemplateForm.clickPaymentTermsInfoIcon();

      cy.log('Step 5. Check "Multi-year prepayment" checkbox');
      OrderTemplateForm.enableMultiYearPrepayment();

      // Expected: checkbox checked; Payment terms active/expanded with blank Total price,
      // disabled blank Prepayment term, blank Starting fiscal year, "Remaining amount ... $0.00"
      OrderTemplateForm.assertMultiYearPrepaymentChecked();
      OrderTemplateForm.assertPaymentTermsExpanded();
      OrderTemplateForm.assertPrepaymentTermsRemainingAmount(formatAmount(0));
      OrderTemplateForm.assertPaymentTermsInitialState();

      cy.log('Step 6. Expand "Starting fiscal year" dropdown in the "Payment terms" accordion');
      OrderTemplateForm.toggleStartingFiscalYearDropdown();
      // Expected: only current and future fiscal years are displayed; previous FY is NOT displayed
      OrderTemplateForm.assertFiscalYearOptionPresent(fy2.code);
      OrderTemplateForm.assertFiscalYearOptionPresent(fy3.code);
      OrderTemplateForm.assertFiscalYearOptionPresent(fy4.code);
      OrderTemplateForm.assertFiscalYearOptionAbsent(fy1.code);
      OrderTemplateForm.toggleStartingFiscalYearDropdown();

      cy.log('Step 7. Click (i) icon next to the "Starting fiscal year" dropdown');
      OrderTemplateForm.clickStartingFiscalYearInfoIcon();
      OrderTemplateForm.verifyStartingFiscalYearInfoPopover();

      cy.log('Step 8. Select the current FY in the dropdown');
      OrderTemplateForm.selectStartingFiscalYear(fy2.code);
      // Expected: 2 cards (FY #2, FY #3); Prepayment term = 2; trash only on FY #3 card; Add FY active
      OrderTemplateForm.assertFiscalYearCards([fy2.code, fy3.code]);
      OrderTemplateForm.assertPrepaymentTermValue(2);
      OrderTemplateForm.assertOnlyFiscalYearCardRemovable([fy2.code, fy3.code], fy3.code);
      OrderTemplateForm.assertAddFiscalYearButtonEnabled();

      cy.log('Step 9. Click "Add fiscal year" button');
      OrderTemplateForm.clickAddFiscalYearButton();
      // Expected: 3 cards (FY #2, FY #3, FY #4); Prepayment term = 3; trash only on FY #4 card; Add FY inactive
      OrderTemplateForm.assertFiscalYearCards([fy2.code, fy3.code, fy4.code]);
      OrderTemplateForm.assertPrepaymentTermValue(3);
      OrderTemplateForm.assertOnlyFiscalYearCardRemovable(fiscalYearCodes, fy4.code);
      OrderTemplateForm.assertAddFiscalYearButtonDisabled();

      cy.log(
        'Step 10. Click "Add fund distribution" button in the Fiscal year 1 card (current FY)',
      );
      OrderTemplateForm.addFundDistributionInFYCard(fy2.code);
      // Expected: not-required Fund ID / Value / Type (currency default) / Amount / Trash fields appear
      OrderTemplateForm.assertEmptyFundDistributionRow({ fyCode: fy2.code });

      cy.log('Step 11. Select Fund A in the "Fund ID" dropdown');
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      // Expected: Fund A selected; "Expense class" not-required field appears in the Fiscal year 1 card
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
      OrderTemplateForm.assertExpenseClassFieldPresentInFYCard(fy2.code);

      cy.log('Step 12. Click trash icon next to the Fund row in the Fiscal year 1 card');
      OrderTemplateForm.removeFundDistributionInFYCard({ fyCode: fy2.code });
      // Expected: fund distribution removed; only active "Add fund distribution" button remains
      OrderTemplateForm.assertFundDistributionAbsentInFYCard(fy2.code);

      cy.log(
        'Step 13. Add fund distribution in the Fiscal year 3 card; Select Fund A; Select % toggle',
      );
      OrderTemplateForm.addFundDistributionInFYCard(fy4.code);
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      OrderTemplateForm.selectDistributionTypePercentInFYCard({ fyCode: fy4.code });
      // Expected: Fund A is selected in the Fiscal year 3 card
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
      OrderTemplateForm.assertDistributionTypePercentInFYCard({ fyCode: fy4.code });

      cy.log('Step 14. Add fund distribution in the Fiscal year 2 card; Select Fund B');
      OrderTemplateForm.addFundDistributionInFYCard(fy3.code);
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy3.code,
        fundName: fundB.name,
        fundCode: fundB.code,
      });
      // Expected: Fund B is selected in the Fiscal year 2 card
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

      cy.log(
        'Step 15. Fill in the "Name" field; Select USD in the "Currency" dropdown; Click "Save"',
      );
      cy.intercept('POST', '**/orders/order-templates').as('template1Created');
      OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.COST_DETAILS);
      OrderTemplateForm.fillInfoSectionFields({
        templateName: testData.template1Name,
        templateCode: testData.template1Code,
      });
      OrderTemplateForm.selectCurrency('USD');
      OrderTemplateForm.clickSaveButton();
      // Expected: "Order templates" pane; toast "The template was saved"
      cy.wait('@template1Created').then(({ response }) => {
        flow.set(R.TEMPLATE_1, response.body, () => OrderTemplates.deleteOrderTemplateViaApi(response.body.id, { failOnStatusCode: false }));
      });
      OrderTemplates.waitLoading();

      cy.log('Step 16. Click on the just created order template; Click "Expand all" link');
      OrderTemplates.selectTemplate(testData.template1Name);
      OrderTemplates.expandAll();
      // Expected: Ongoing accordion shows checked Multi-year prepayment; Payment terms shows data for
      // the Fiscal year 2 and Fiscal year 3 cards; "The list contains no items" in the Fiscal year 1 card
      OrderTemplates.assertMultiYearPrepaymentChecked();
      OrderTemplates.assertPaymentTermsCardContainsFund(fy3.code, fundB.name);
      OrderTemplates.assertPaymentTermsCardContainsFund(fy4.code, fundA.name);
      OrderTemplates.assertPaymentTermsCardShowsNoItems(fy2.code);

      cy.log(
        'Step 17. Click "Actions" button; Select "Duplicate" option; Click "Submit" in the "Duplicate template" modal',
      );
      cy.intercept('POST', '**/orders/order-templates').as('template2Created');
      OrderTemplates.duplicateTemplate();
      // Expected: "<name> (Copy) - <MM/DD/YYYY, HH:MM:SS AM>" edit page; toast "The template was
      // successfully duplicated"; new template contains the same data
      OrderTemplateForm.waitLoading();

      cy.wait('@template2Created').then(({ response }) => {
        const duplicatedTemplate = response.body;

        flow.set(R.TEMPLATE_2, duplicatedTemplate, () => OrderTemplates.deleteOrderTemplateViaApi(duplicatedTemplate.id, {
          failOnStatusCode: false,
        }));

        expect(duplicatedTemplate.templateName).to.match(
          new RegExp(`^${Cypress._.escapeRegExp(testData.template1Name)} \\(Copy\\) - `),
        );
        expect(comparableTemplate(duplicatedTemplate)).to.deep.equal(
          comparableTemplate(flow.get(R.TEMPLATE_1)),
        );

        OrderTemplateForm.expandAll();
        OrderTemplateForm.assertInfoSectionFields({
          templateName: duplicatedTemplate.templateName,
          templateCode: testData.template1Code,
        });

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

      cy.log(
        'Step 18. Click on the eye icon next to the "Multi-year prepayment" checkbox and "Payment terms" accordion; Click "Save"',
      );
      OrderTemplateForm.fillPrepaymentTotalPrice(100);
      OrderTemplateForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 50,
      });
      OrderTemplateForm.selectDistributionTypeAmountInFYCard({ fyCode: fy4.code });
      OrderTemplateForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 50,
      });

      OrderTemplateForm.toggleMultiYearPrepaymentVisibility();
      OrderTemplateForm.togglePaymentTermsVisibility();
      OrderTemplateForm.clickSaveButton();
      // Expected: "Order templates" pane; toast "The template was saved"
      OrderTemplates.waitLoading();

      cy.log(
        'Step 19. Navigate to "Orders" app; Select "Order" toggle; Click "New"; Select order template #2; Fill mandatory fields; Click "Save & close"',
      );
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      OrderLines.waitLoading();
      OrderLines.selectOrders();

      // The duplicate name is generated by the server in step 17, so resolve it at execution time.
      cy.then(() => {
        return createOrderFromTemplate({
          templateName: `${flow.get(R.TEMPLATE_2).templateName} (${flow.get(R.TEMPLATE_2).templateCode})`,
          resourceKey: R.ORDER_2,
          flow,
        });
      });
      // Expected: "Purchase order" pane; toast "The Purchase order - number has been successfully saved"
      OrderDetails.waitLoading();

      cy.log(
        'Step 20. Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      // Expected: "Multi-year prepayment" checkbox is NOT displayed; "Payment terms" accordion is NOT displayed
      OrderLineEditForm.assertMultiYearPrepaymentAbsent();
      OrderLineEditForm.assertPaymentTermsSectionAbsent();

      cy.log('Step 21. Fill in all required fields; Click "Save & close" button');
      fillPolRequiredFields({
        form: OrderLineEditForm,
        title: testData.polTitle2,
        acquisitionMethod: acqMethod.value,
      });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: "PO Line details" pane; toast "The purchase order line was successfully created";
      // Multi-year prepayment checkbox NOT displayed; "Payment terms" accordion NOT displayed
      OrderLineDetails.waitLoading();
      OrderLineDetails.assertMultiYearPrepaymentAbsent();
      OrderLineDetails.assertPaymentTermsSectionAbsent();

      cy.log(
        'Step 22. Click "New" button on the "Orders" pane; Select order template #1; Fill mandatory fields; Click "Save & close"',
      );
      OrderLineDetails.backToOrderDetails();
      OrderDetails.closeOrderDetails();
      Orders.waitLoading();
      createOrderFromTemplate({
        templateName: `${testData.template1Name} (${testData.template1Code})`,
        resourceKey: R.ORDER_1,
        flow,
      });
      // Expected: "Purchase order" pane; toast "The Purchase order - number has been successfully saved"
      OrderDetails.waitLoading();

      cy.log(
        'Step 23. Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      // Expected: checked "Multi-year prepayment" checkbox with (i) icon; active "Payment terms"
      // accordion shows the same data as configured in the template
      OrderLineEditForm.assertPaymentTermsSectionPresent();
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

      cy.log(
        'Step 24. Fill in all required fields; Do NOT fill "Fund distribution" and "Payment terms"; Click "Save & close"',
      );
      fillPolRequiredFields({
        form: OrderLineEditForm,
        title: testData.polTitle1,
        acquisitionMethod: acqMethod.value,
      });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: false });
      OrderLineEditForm.assertPaymentTermsMixTypesOfZeroPriceValidationError();

      cy.log(
        'Step 25. Fill "Total price" with 1500; Enter 300 in the Fiscal year 2 card (Fund B); Enter 25 in the Fiscal year 3 card (Fund A)',
      );
      OrderLineEditForm.fillPrepaymentTotalPrice(1500);
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 300,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 25,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: red validation message and "Remaining amount to be distributed: $825.00"
      OrderLineEditForm.assertPaymentTermsPercentageValidationError();
      OrderLineEditForm.assertPaymentTermsRemainingAmount('825.00');

      cy.log(
        'Step 26. Add fund distribution in the Fiscal year 1 card; Select Fund A; Select expense class #1; Select % toggle; Enter 25',
      );
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: fy2.code,
        expenseClassName: expenseClass1.name,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy2.code });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 25,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: red validation message and "Remaining amount to be distributed: $450.00"
      OrderLineEditForm.assertPaymentTermsPercentageValidationError();
      OrderLineEditForm.assertPaymentTermsRemainingAmount('450.00');

      cy.log('Step 27. Add fund distribution in the Fiscal year 1 card; Select Fund B; Enter 250');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 250,
        rowIndex: 1,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: red validation message and "Remaining amount to be distributed: $200.00"
      OrderLineEditForm.assertPaymentTermsPercentageValidationError();
      OrderLineEditForm.assertPaymentTermsRemainingAmount('200.00');

      cy.log('Step 28. Add fund distribution in the Fiscal year 3 card; Select Fund A; Enter 200');
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 1,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 200,
        rowIndex: 1,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: "You can not have multiple distributions for the same fund with the same expense class."
      OrderLineEditForm.assertMultipleDistributionsSameFundError();

      cy.log('Step 29. Select Fund B instead of Fund A in the Fiscal year 3 card');
      OrderLineEditForm.selectFundInPaymentTermsCard({
        fyCode: fy4.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      triggerFundDistributionValidation(OrderLineEditForm);
      // Expected: "Remaining amount to be distributed: $0.00"
      OrderLineEditForm.assertPaymentTermsRemainingAmount('0.00');

      cy.log('Step 30. Click "Save & close" button');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: "PO Line details"; toast "The purchase order line was successfully created";
      // Ongoing accordion shows checked Multi-year prepayment; Fund distribution accordion blank;
      // Payment terms accordion shows three Fiscal year cards populated with the entered values
      OrderLineDetails.waitLoading();
      OrderLineDetails.assertMultiYearPrepaymentChecked();
      OrderLineDetails.assertFundDistributionAccordionBlank();
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

      cy.log('Step 31. Click "Actions" button; Select "Edit" option');
      FinanceHelper.interceptGetFiscalYearsRequest();
      OrderLineDetails.openOrderLineEditForm();
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();
      // Expected: "Edit PO line" page; Multi-year prepayment checkbox checked and enabled;
      // Fund distribution accordion blank; Payment terms accordion shows three populated Fiscal year cards
      OrderLineEditForm.assertFundDistributionSectionEmpty();
      OrderLineEditForm.assertPaymentTermsSectionPresent();
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
    },
  );
});
