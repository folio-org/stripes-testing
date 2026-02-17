import { APPLICATION_NAMES, LOCATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { Budgets } from '../../support/fragments/finance';
import { OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import ExpenseClasses from '../../support/fragments/settings/finance/expenseClasses';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {
    orderLineTitle: `autotest_order_line_title_${getRandomPostfix()}`,
  };
  const organization = NewOrganization.getDefaultOrganization({ isVendor: true });
  const expenseClass1 = { ...ExpenseClasses.getDefaultExpenseClass() };
  const expenseClass2 = {
    ...ExpenseClasses.getDefaultExpenseClass(),
    name: `autotest_class_2_name_${getRandomPostfix()}`,
  };

  before(() => {
    cy.getAdminToken();
    ExpenseClasses.createExpenseClassViaApi(expenseClass1).then((ec1) => {
      testData.expenseClass1 = ec1;

      ExpenseClasses.createExpenseClassViaApi(expenseClass2).then((ec2) => {
        testData.expenseClass2 = ec2;

        const { fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          budget: {
            allocated: 100,
            statusExpenseClasses: [
              {
                status: 'Active',
                expenseClassId: testData.expenseClass1.id,
              },
              {
                status: 'Active',
                expenseClassId: testData.expenseClass2.id,
              },
            ],
          },
        });
        testData.fund = fund;
      });
    });
    Organizations.createOrganizationViaApi(organization).then((responseOrganizations) => {
      organization.id = responseOrganizations;
    });
    cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((locationResp) => {
      testData.location = locationResp;
    });

    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    Orders.getOrdersApi({ limit: 1, query: `"poNumber"=="${testData.orderNumber}"` }).then(
      (order) => {
        Orders.deleteOrderViaApi(order[0].id);
      },
    );
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C402774 PO line for "Ongoing" order can not be saved when "Expense class" field is empty (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C402774'] },
    () => {
      const NewOrderForm = Orders.clickCreateNewOrder();
      NewOrderForm.fillOrderInfoSectionFields({
        organizationName: organization.name,
        orderType: 'Ongoing',
      });
      NewOrderForm.getOrderNumber().then((orderNumber) => {
        testData.orderNumber = orderNumber;

        NewOrderForm.clickSaveButton();
        InteractorsTools.checkCalloutMessage(
          `The Purchase order - ${orderNumber} has been successfully saved`,
        );
      });
      Orders.createPOLineViaActions();
      OrderLines.fillTitleInPOLine(testData.orderLineTitle);
      OrderLines.fillInPOLineInfoForElectronicWithFund(
        testData.fund,
        '10',
        '1',
        '100',
        testData.location.name,
      );
      OrderLines.setElectronicQuantity('1');
      OrderLines.save();
      OrderLines.verifyExpenseClassRequiredFieldWarningMessage();
      OrderLines.deleteFundInPOL();
      OrderLines.clickAddFundDistributionButton();
      OrderLines.fillFundInPOLWithoutExpenseClass(testData.fund);
      OrderLines.save();
      OrderLines.verifyExpenseClassRequiredFieldWarningMessage();
    },
  );
});
