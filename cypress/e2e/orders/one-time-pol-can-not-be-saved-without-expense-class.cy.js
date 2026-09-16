import {
  ACQUISITION_METHOD_NAMES,
  COMMON_BUTTON_LABELS,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_TYPES,
  POLINE_DETAILS_FIELDS,
} from '../../support/constants';
import { Budgets } from '../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import getRandomPostfix from '../../support/utils/stringTools';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import { OrderDetails, OrderLineEditForm, Orders } from '../../support/fragments/orders';
import NewLocation from '../../support/fragments/settings/tenant/locations/newLocation';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    fund: {},
    budget: {},
    expenseClasses: [],
    location: {},
    order: {},
    user: {},
  };

  const createExpenseClass = () => {
    return ExpenseClasses.createExpenseClassViaApi(ExpenseClasses.getDefaultExpenseClass()).then(
      (expenseClass) => {
        testData.expenseClasses.push(expenseClass);
      },
    );
  };

  const createExpenseClasses = () => {
    return createExpenseClass().then(createExpenseClass);
  };

  const createFinanceData = () => {
    const financeData = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
      expenseClasses: testData.expenseClasses,
    });

    testData.fund = financeData.fund;
    testData.budget = financeData.budget;
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
      testData.organization.id = id;
    });
  };

  const createLocation = () => {
    return ServicePoints.getViaApi().then((servicePoints) => {
      return NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoints[0].id)).then(
        (location) => {
          testData.location = location;
        },
      );
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createExpenseClasses()
      .then(createFinanceData)
      .then(createOrganization)
      .then(createLocation)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      if (testData.order.id) {
        Orders.deleteOrderViaApi(testData.order.id);
      }
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
        testData.location.institutionId,
        testData.location.campusId,
        testData.location.libraryId,
        testData.location.id,
      );
      Budgets.getBudgetByIdViaApi(testData.budget.id).then((budget) => {
        Budgets.updateBudgetViaApi({ ...budget, statusExpenseClasses: [] });
        Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
        testData.expenseClasses.forEach(({ id }) => ExpenseClasses.deleteExpenseClassViaApi(id));
      });
    });
  });

  it(
    'C402773 PO line for "One-time" order can not be saved when "Expense class" field is empty (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C402773'] },
    () => {
      // Step 1: Open "Create purchase order" page
      const OrderEditForm = Orders.clickCreateNewOrder();
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: true } },
      ]);

      // Step 2: Fill in order fields
      OrderEditForm.fillOrderFields({
        orderInfo: {
          organizationName: testData.organization.name,
          orderType: ORDER_TYPES.ONE_TIME,
        },
      });
      OrderEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 3: Save the order
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();
      cy.url().then((url) => {
        testData.order.id = url.match(/\/orders\/view\/([^/?]+)/)?.[1];
      });

      // Step 4: Open "Add PO line" page
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.CANCEL, conditions: { disabled: false } },
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 5: Fill in mandatory PO line fields
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: `AT_C402773_Instance_${getRandomPostfix()}` },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
        },
        costDetails: {
          physicalUnitPrice: '1',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.SAVE_AND_CLOSE, conditions: { disabled: false } },
      ]);

      // Step 6: Add fund distribution without expense class
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.selectFundFromOpenDropdown(testData.fund.name, testData.fund.code);

      // Step 7: Add location
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillOrderLineFields({
        locationDetails: [{ quantityPhysical: '1' }],
      });

      // Step 8: PO line can not be saved without expense class
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: false });
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkRequiredFields([POLINE_DETAILS_FIELDS.EXPENSE_CLASS]);

      // Step 9: Delete fund distribution record
      OrderLineEditForm.deleteFundDistribution();

      // Step 10: Add fund distribution without expense class once again
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.selectFundFromOpenDropdown(testData.fund.name, testData.fund.code);
      OrderLineEditForm.expandExpenseClassDropdown();

      // Step 11: PO line still can not be saved without expense class
      OrderLineEditForm.clickSaveButton({ orderLineUpdated: false });
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkRequiredFields([POLINE_DETAILS_FIELDS.EXPENSE_CLASS]);
    },
  );
});
