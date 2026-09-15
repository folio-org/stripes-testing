import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ExecutionFlowManager } from '../../../support/utils';
import { ORDER_TYPES } from '../../../support/constants/orders/order';
import { APPLICATION_NAMES } from '../../../support/constants';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import { ExpenseClasses } from '../../../support/fragments/settings/finance';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

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
    TEMPLATE_1_ID: 'template1Id',
    TEMPLATE_2_ID: 'template2Id',
    ORDER_1: 'order1',
    ORDER_2: 'order2',
  };

  // Shared alphabetical part for the four fiscal year codes (e.g. FYAB2025..FYAB2028)
  const fyCodePrefix = `FY${getRandomPostfix()}`
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  const currentYear = new Date().getFullYear();

  const testData = {
    template1Name: `AT_Template1_${getRandomPostfix()}`,
    template1Code: `T1${getRandomPostfix()}`,
    template2Name: '', // resolved after duplication ("<name> (Copy) - ...")
    polTitle1: `AT_POL1_${getRandomPostfix()}`,
    polTitle2: `AT_POL2_${getRandomPostfix()}`,
    expenseClass1Name: `Electronic_${getRandomPostfix()}`,
    expenseClass2Name: `Print_${getRandomPostfix()}`,
  };

  const buildFiscalYear = (yearOffset) => ({
    ...FiscalYears.getDefaultFiscalYear(),
    code: `${fyCodePrefix}${currentYear + yearOffset}`,
    periodStart: `${currentYear + yearOffset}-01-01T00:00:00.000+00:00`,
    periodEnd: `${currentYear + yearOffset}-12-31T00:00:00.000+00:00`,
  });

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    flow
      // Precondition 1: Previous fiscal year (FY #1) with the shared alphabetical part
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(-1)).then((fy1) => {
          f.set(R.FY1, fy1, () => FiscalYears.deleteFiscalYearViaApi(fy1.id));
        });
      })
      // Precondition 1: Current fiscal year (FY #2) whose period includes the current date
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(0)).then((fy2) => {
          f.set(R.FY2, fy2, () => FiscalYears.deleteFiscalYearViaApi(fy2.id));
        });
      })
      // Precondition 1: First future fiscal year (FY #3)
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(1)).then((fy3) => {
          f.set(R.FY3, fy3, () => FiscalYears.deleteFiscalYearViaApi(fy3.id));
        });
      })
      // Precondition 1: Second future fiscal year (FY #4)
      .step((f) => {
        return FiscalYears.createViaApi(buildFiscalYear(2)).then((fy4) => {
          f.set(R.FY4, fy4, () => FiscalYears.deleteFiscalYearViaApi(fy4.id));
        });
      })
      // Precondition 2: Active Ledger related to the created Fiscal year #1
      .step((f) => {
        const { fy1 } = f.ctx();
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fy1.id,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id));
        });
      })
      // Precondition 3: Active Fund A related to the created Ledger
      .step((f) => {
        const { ledger } = f.ctx();
        return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: ledger.id }).then(
          (response) => {
            f.set(R.FUND_A, response.fund, () => Funds.deleteFundViaApi(response.fund.id));
          },
        );
      })
      // Precondition 3: Active Fund B related to the created Ledger
      .step((f) => {
        const { ledger } = f.ctx();
        return Funds.createViaApi({ ...Funds.getDefaultFund(), ledgerId: ledger.id }).then(
          (response) => {
            f.set(R.FUND_B, response.fund, () => Funds.deleteFundViaApi(response.fund.id));
          },
        );
      })
      // Precondition 3: Expense class #1 ("Electronic") for Fund A's current budget
      .step((f) => {
        return ExpenseClasses.createExpenseClassViaApi({
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: testData.expenseClass1Name,
        }).then((ec) => {
          f.set(R.EXPENSE_CLASS_1, ec, () => ExpenseClasses.deleteExpenseClassViaApi(ec.id));
        });
      })
      // Precondition 3: Expense class #2 ("Print") for Fund A's current budget
      .step((f) => {
        return ExpenseClasses.createExpenseClassViaApi({
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: testData.expenseClass2Name,
        }).then((ec) => {
          f.set(R.EXPENSE_CLASS_2, ec, () => ExpenseClasses.deleteExpenseClassViaApi(ec.id));
        });
      })
      // Precondition 3: Fund A current budget ($1000) with both expense classes activated
      .step((f) => {
        const { fundA, fy2, expenseClass1, expenseClass2 } = f.ctx();
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy2.id,
          fundId: fundA.id,
          allocated: 1000,
        }).then((budget) => {
          return Budgets.updateBudgetViaApi({
            ...budget,
            statusExpenseClasses: [
              { status: 'Active', expenseClassId: expenseClass1.id },
              { status: 'Active', expenseClassId: expenseClass2.id },
            ],
          }).then(() => {
            f.set(R.BUDGET_A, budget, () => Budgets.deleteViaApi(budget.id));
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
        }).then((budget) => {
          f.set(R.BUDGET_B, budget, () => Budgets.deleteViaApi(budget.id));
        });
      })
      // Precondition: Organization (vendor) used by the order templates
      .step((f) => {
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
          (org) => {
            f.set(R.ORG, org, () => Organizations.deleteOrganizationViaApi(org.id));
          },
        );
      })
      // Precondition: Acquisition method "Other" used when filling the PO lines
      .step((f) => {
        return cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
          f.set(R.ACQ_METHOD, body.acquisitionMethods[0].value);
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
      const { fy1, fy2, fy3, fy4, fundA, fundB, org, acqMethod, expenseClass1 } = flow.ctx();

      // Fills the required PO line fields shared across several steps
      const fillPolRequiredFields = (title) => {
        OrderLineEditForm.fillItemDetailsTitle({ instanceTitle: title });
        OrderLineEditForm.fillPoLineDetails({ acquisitionMethod: acqMethod, orderFormat: 'Other' });
        OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '100', quantityPhysical: '1' });
      };

      cy.log('Step 1. Click "New" button on the "Order templates" pane');
      OrderTemplates.clickNewOrderTemplateButton();
      OrderTemplateForm.waitLoading();
      // Expected: "POL Ongoing order information" and "Payment terms" accordions are NOT displayed
      OrderTemplateForm.checkPolOngoingOrderSectionAbsent();
      OrderTemplateForm.checkPaymentTermsSectionAbsent();

      cy.log('Step 2. Select "Ongoing" option in the "Order type" field');
      OrderTemplateForm.fillPoInfoSectionFields({
        organizationName: org.name,
        orderType: ORDER_TYPES.ONGOING,
      });
      // Expected: Ongoing accordions appear; unchecked "Multi-year prepayment" checkbox with (i);
      // "Payment terms" accordion is displayed and collapsed by default
      OrderTemplateForm.checkPolOngoingOrderSectionPresent();
      OrderTemplateForm.checkPaymentTermsSectionPresent();
      OrderTemplateForm.checkMultiYearPrepaymentUnchecked();

      cy.log('Step 3. Click on the (i) icon next to the "Multi-year prepayment" checkbox');
      OrderTemplateForm.clickMultiYearPrepaymentInfoIcon();
      OrderTemplateForm.verifyMultiYearPrepaymentInfoPopover();

      cy.log('Step 4. Click on the (i) icon next to the "Payment terms" accordion');
      OrderTemplateForm.clickPaymentTermsInfoIcon();
      OrderTemplateForm.verifyPaymentTermsInfoPopover();

      cy.log('Step 5. Check "Multi-year prepayment" checkbox');
      OrderTemplateForm.enableMultiYearPrepayment();
      // Expected: checkbox checked; Payment terms active/expanded with blank Total price,
      // disabled blank Prepayment term, blank Starting fiscal year, "Remaining amount ... $0.00"
      OrderTemplateForm.checkMultiYearPrepaymentChecked();
      OrderTemplateForm.checkPaymentTermsExpanded();
      OrderTemplateForm.checkPaymentTermsInitialState();

      cy.log('Step 6. Expand "Starting fiscal year" dropdown in the "Payment terms" accordion');
      OrderTemplateForm.openStartingFiscalYearDropdown();
      // Expected: only current and future fiscal years are displayed; previous FY is NOT displayed
      OrderTemplateForm.checkFiscalYearOptionPresent(fy2.code);
      OrderTemplateForm.checkFiscalYearOptionPresent(fy3.code);
      OrderTemplateForm.checkFiscalYearOptionPresent(fy4.code);
      OrderTemplateForm.checkFiscalYearOptionAbsent(fy1.code);

      cy.log('Step 7. Click (i) icon next to the "Starting fiscal year" dropdown');
      OrderTemplateForm.clickStartingFiscalYearInfoIcon();
      OrderTemplateForm.verifyStartingFiscalYearInfoPopover();

      cy.log('Step 8. Select the current FY in the dropdown');
      OrderTemplateForm.selectStartingFiscalYear(fy2.code);
      // Expected: 2 cards (FY #2, FY #3); Prepayment term = 2; trash only on FY #3 card; Add FY active
      OrderTemplateForm.checkFiscalYearCardPresent(fy2.code);
      OrderTemplateForm.checkFiscalYearCardPresent(fy3.code);
      OrderTemplateForm.checkPrepaymentTermValue(2);
      OrderTemplateForm.checkAddFiscalYearButtonEnabled();

      cy.log('Step 9. Click "Add fiscal year" button');
      OrderTemplateForm.clickAddFiscalYearButton();
      // Expected: 3 cards (FY #2, FY #3, FY #4); Prepayment term = 3; trash only on FY #4 card; Add FY inactive
      OrderTemplateForm.checkFiscalYearCardPresent(fy4.code);
      OrderTemplateForm.checkPrepaymentTermValue(3);
      OrderTemplateForm.checkAddFiscalYearButtonDisabled();

      cy.log(
        'Step 10. Click "Add fund distribution" button in the Fiscal year 1 card (current FY)',
      );
      OrderTemplateForm.addFundDistributionInFYCard(fy2.code);
      // Expected: not-required Fund ID / Value / Type (currency default) / Amount / Trash fields appear

      cy.log('Step 11. Select Fund A in the "Fund ID" dropdown');
      OrderTemplateForm.selectFundInFYCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      // Expected: Fund A selected; "Expense class" not-required field appears in the Fiscal year 1 card
      OrderTemplateForm.checkExpenseClassFieldPresentInFYCard(fy2.code);

      cy.log('Step 12. Click trash icon next to the Fund row in the Fiscal year 1 card');
      OrderTemplateForm.removeFundDistributionInFYCard({ fyCode: fy2.code, rowIndex: 0 });
      // Expected: fund distribution removed; only active "Add fund distribution" button remains
      OrderTemplateForm.checkFundDistributionAbsentInFYCard(fy2.code);

      cy.log(
        'Step 13. Add fund distribution in the Fiscal year 3 card; Select Fund A; Select % toggle',
      );
      OrderTemplateForm.addFundDistributionInFYCard(fy4.code);
      OrderTemplateForm.selectFundInFYCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      OrderTemplateForm.selectDistributionTypePercentInFYCard({ fyCode: fy4.code, rowIndex: 0 });
      // Expected: Fund A is selected in the Fiscal year 3 card

      cy.log('Step 14. Add fund distribution in the Fiscal year 2 card; Select Fund B');
      OrderTemplateForm.addFundDistributionInFYCard(fy3.code);
      OrderTemplateForm.selectFundInFYCard({
        fyCode: fy3.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 0,
      });
      // Expected: Fund B is selected in the Fiscal year 2 card

      cy.log(
        'Step 15. Fill in the "Name" field; Select USD in the "Currency" dropdown; Click "Save"',
      );
      cy.intercept('POST', '**/orders/order-templates').as('template1Created');
      OrderTemplateForm.fillInfoSectionFields({
        templateName: testData.template1Name,
        templateCode: testData.template1Code,
      });
      OrderTemplateForm.selectCurrency('USD');
      OrderTemplateForm.clickSaveButton();
      // Expected: "Order templates" pane; toast "The template was saved"
      cy.wait('@template1Created').then(({ response }) => {
        flow.set(R.TEMPLATE_1_ID, response.body.id, () => OrderTemplates.deleteOrderTemplateViaApi(response.body.id));
      });
      OrderTemplates.waitLoading();

      cy.log('Step 16. Click on the just created order template; Click "Expand all" link');
      OrderTemplates.selectTemplate(testData.template1Name);
      OrderTemplates.expandAll();
      // Expected: Ongoing accordion shows checked Multi-year prepayment; Payment terms shows data for
      // the Fiscal year 2 and Fiscal year 3 cards; "The list contains no items" in the Fiscal year 1 card
      OrderTemplates.checkMultiYearPrepaymentChecked();
      OrderTemplates.checkPaymentTermsCardContainsFund(fy3.code, fundB.name);
      OrderTemplates.checkPaymentTermsCardContainsFund(fy4.code, fundA.name);
      OrderTemplates.checkPaymentTermsCardShowsNoItems(fy2.code);

      cy.log(
        'Step 17. Click "Actions" button; Select "Duplicate" option; Click "Submit" in the "Duplicate template" modal',
      );
      cy.intercept('POST', '**/orders/order-templates').as('template2Created');
      OrderTemplates.duplicateTemplate();
      // Expected: "<name> (Copy) - <MM/DD/YYYY, HH:MM:SS AM>" edit page; toast "The template was
      // successfully duplicated"; new template contains the same data
      OrderTemplateForm.waitLoading();
      cy.wait('@template2Created').then(({ response }) => {
        testData.template2Name = response.body.templateName;
        flow.set(R.TEMPLATE_2_ID, response.body.id, () => OrderTemplates.deleteOrderTemplateViaApi(response.body.id));
      });

      cy.log(
        'Step 18. Click on the eye icon next to the "Multi-year prepayment" checkbox and "Payment terms" accordion; Click "Save"',
      );
      OrderTemplateForm.clickHideEyeIconForMultiYearPrepayment();
      OrderTemplateForm.clickHideEyeIconForPaymentTerms();
      OrderTemplateForm.clickSaveButton();
      // Expected: "Order templates" pane; toast "The template was saved"
      OrderTemplates.waitLoading();

      cy.log(
        'Step 19. Navigate to "Orders" app; Select "Order" toggle; Click "New"; Select order template #2; Fill mandatory fields; Click "Save & close"',
      );
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.waitLoading();
      OrderLines.selectOrders();
      Orders.createOrderByTemplateAndCapture(testData.template2Name).then((order) => {
        flow.set(R.ORDER_2, order, () => Orders.deleteOrderViaApi(order.id, false));
      });
      // Expected: "Purchase order" pane; toast "The Purchase order - number has been successfully saved"
      OrderDetails.waitLoading();

      cy.log(
        'Step 20. Click "Actions" button in the "PO lines" accordion; Select "Add PO line" option',
      );
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      // Expected: "Multi-year prepayment" checkbox is NOT displayed; "Payment terms" accordion is NOT displayed
      OrderLineEditForm.checkMultiYearPrepaymentAbsent();
      OrderLineEditForm.checkPaymentTermsSectionAbsent();

      cy.log('Step 21. Fill in all required fields; Click "Save & close" button');
      fillPolRequiredFields(testData.polTitle2);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: "PO Line details" pane; toast "The purchase order line was successfully created";
      // Multi-year prepayment checkbox NOT displayed; "Payment terms" accordion NOT displayed
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkPaymentTermsSectionAbsent();

      cy.log(
        'Step 22. Click "New" button on the "Orders" pane; Select order template #1; Fill mandatory fields; Click "Save & close"',
      );
      OrderLineDetails.backToOrderDetails();
      OrderDetails.closeOrderDetails();
      Orders.waitLoading();
      Orders.createOrderByTemplateAndCapture(testData.template1Name).then((order) => {
        flow.set(R.ORDER_1, order, () => Orders.deleteOrderViaApi(order.id, false));
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
      OrderLineEditForm.checkMultiYearPrepaymentChecked();
      OrderLineEditForm.checkPaymentTermsSectionPresent();

      cy.log(
        'Step 24. Fill in all required fields; Do NOT fill "Fund distribution" and "Payment terms"; Click "Save & close"',
      );
      fillPolRequiredFields(testData.polTitle1);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: "Add PO line" page still displayed; fields in the "Payment terms" accordion highlighted in red
      OrderLineEditForm.checkPaymentTermsPercentageValidationError();

      cy.log(
        'Step 25. Fill "Total price" with 1500; Enter 300 in the Fiscal year 2 card (Fund B); Enter 25 in the Fiscal year 3 card (Fund A)',
      );
      OrderLineEditForm.fillPaymentTermsTotalPrice(1500);
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy3.code,
        value: 300,
        rowIndex: 0,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 25,
        rowIndex: 0,
      });
      // Expected: red validation message and "Remaining amount to be distributed: $825.00"
      OrderLineEditForm.checkPaymentTermsPercentageValidationError();
      OrderLineEditForm.checkPaymentTermsRemainingAmount('825.00');

      cy.log(
        'Step 26. Add fund distribution in the Fiscal year 1 card; Select Fund A; Select expense class #1; Select % toggle; Enter 25',
      );
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.selectFundInFYCard({
        fyCode: fy2.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyCode: fy2.code,
        expenseClassName: expenseClass1.name,
        rowIndex: 0,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyCode: fy2.code, rowIndex: 0 });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 25,
        rowIndex: 0,
      });
      // Expected: red validation message and "Remaining amount to be distributed: $450.00"
      OrderLineEditForm.checkPaymentTermsPercentageValidationError();
      OrderLineEditForm.checkPaymentTermsRemainingAmount('450.00');

      cy.log('Step 27. Add fund distribution in the Fiscal year 1 card; Select Fund B; Enter 250');
      OrderLineEditForm.addFundDistributionInFYCard(fy2.code);
      OrderLineEditForm.selectFundInFYCard({
        fyCode: fy2.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy2.code,
        value: 250,
        rowIndex: 1,
      });
      // Expected: red validation message and "Remaining amount to be distributed: $200.00"
      OrderLineEditForm.checkPaymentTermsPercentageValidationError();
      OrderLineEditForm.checkPaymentTermsRemainingAmount('200.00');

      cy.log('Step 28. Add fund distribution in the Fiscal year 3 card; Select Fund A; Enter 200');
      OrderLineEditForm.addFundDistributionInFYCard(fy4.code);
      OrderLineEditForm.selectFundInFYCard({
        fyCode: fy4.code,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 1,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyCode: fy4.code,
        value: 200,
        rowIndex: 1,
      });
      // Expected: "You can not have multiple distributions for the same fund with the same expense class."
      OrderLineEditForm.checkMultipleDistributionsSameFundError();

      cy.log('Step 29. Select Fund B instead of Fund A in the Fiscal year 3 card');
      OrderLineEditForm.selectFundInFYCard({
        fyCode: fy4.code,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      // Expected: "Remaining amount to be distributed: $0.00"
      OrderLineEditForm.checkPaymentTermsRemainingAmount('0.00');

      cy.log('Step 30. Click "Save & close" button');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: "PO Line details"; toast "The purchase order line was successfully created";
      // Ongoing accordion shows checked Multi-year prepayment; Fund distribution accordion blank;
      // Payment terms accordion shows three Fiscal year cards populated with the entered values
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkMultiYearPrepaymentChecked();
      OrderLineDetails.checkFundDistributionAccordionBlank();
      OrderLineDetails.checkPaymentTermsCardContainsFund(fy2.code, fundA.name);
      OrderLineDetails.checkPaymentTermsCardContainsFund(fy3.code, fundB.name);
      OrderLineDetails.checkPaymentTermsCardContainsFund(fy4.code, fundB.name);

      cy.log('Step 31. Click "Actions" button; Select "Edit" option');
      OrderLineDetails.openOrderLineEditForm();
      // Expected: "Edit PO line" page; Multi-year prepayment checkbox checked and enabled;
      // Fund distribution accordion blank; Payment terms accordion shows three populated Fiscal year cards
      OrderLineEditForm.checkMultiYearPrepaymentChecked();
      OrderLineEditForm.checkMultiYearPrepaymentEnabled();
      OrderLineEditForm.checkPaymentTermsSectionPresent();
    },
  );
});
