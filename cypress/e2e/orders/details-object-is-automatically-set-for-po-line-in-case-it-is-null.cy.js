import { including } from '../../../interactors';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  CURRENCIES,
  ORDER_FORMAT_NAMES,
  ORDER_TYPES,
  RECEIVING_WORKFLOW_NAMES,
  REQUEST_METHOD,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  Orders,
} from '../../support/fragments/orders';
import OrderEditForm from '../../support/fragments/orders/orderEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderTemplates } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const UNIT_PRICE = '10';
  const QUANTITY = '1';
  let testData;

  before('Create test data', () => {
    // Precondition 1: Active vendor organization without "Claiming interval"
    const organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C983203_Organization_${getRandomPostfix()}`,
    };

    testData = {
      organization,
      // Precondition 2: Order template with vendor, order type and USD currency
      orderTemplate: OrderTemplates.getDefaultOrderTemplate({
        additionalProperties: {
          templateName: `AT_C983203_OrderTemplate_${getRandomPostfix()}`,
          vendor: organization.id,
          orderType: ORDER_TYPES.ONE_TIME_API,
        },
      }),
      polTitle: `AT_C983203_POL_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);

    // Precondition 3: User with required permissions is logged in
    cy.createTempUser([Permissions.uiOrdersCreate.gui]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is on "Orders" app, "Orders" toggle is selected
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrdersApi({ query: `vendor=="${testData.organization.id}"` }).then((orders) => {
      orders.forEach((order) => Orders.deleteOrderViaApi(order.id, false));
    });
    OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C983203 Details object is automatically set for PO line in case it is null (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C983203'] },
    () => {
      // Step 1: Click "New" button on the "Orders" pane
      Orders.clickCreateNewOrder();

      // Step 2: Select the order template from Preconditions and click "Save & close" button
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);
      OrderEditForm.verifySelectedOrderTemplate(testData.orderTemplate.templateName);
      OrderEditForm.verifyOrderInformationSection([
        { label: 'vendor', conditions: { value: including(testData.organization.name) } },
        { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
      ]);
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();

      // Step 3: Click "Actions" button in the "PO lines" accordion and select "Add PO line" option
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { singleValue: CURRENCIES.USD } },
      ]);

      // Step 4: Fill in only required fields, open devtools and click "Save & close" button
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.polTitle },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.OTHER,
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
        },
        costDetails: {
          physicalUnitPrice: UNIT_PRICE,
          quantityPhysical: QUANTITY,
        },
      });
      cy.intercept(REQUEST_METHOD.POST, '**/orders/order-lines').as('createOrderLine');
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();
      cy.wait('@createOrderLine').then(({ response }) => {
        expect(response.body.details).to.deep.include({
          isAcknowledged: false,
          isBinderyActive: false,
          productIds: [],
        });
      });
    },
  );
});
