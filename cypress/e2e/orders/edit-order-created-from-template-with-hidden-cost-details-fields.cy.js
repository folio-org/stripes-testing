import { ORDER_AND_ORDER_LINE_BUTTONS, POLINE_DETAILS_FIELDS } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderTemplates } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const SHOW_HIDDEN_FIELDS = ORDER_AND_ORDER_LINE_BUTTONS.SHOW_HIDDEN_FIELDS;
  const HIDDEN_EXCHANGE_RATE_FIELDS = [
    POLINE_DETAILS_FIELDS.CURRENT_EXCHANGE_RATE,
    POLINE_DETAILS_FIELDS.USE_SET_EXCHANGE_RATE,
    POLINE_DETAILS_FIELDS.SET_EXCHANGE_RATE,
  ];
  let testData;

  before('Create test data', () => {
    testData = {
      // Vendor organization without currencies in "Vendor information" accordion
      organization: NewOrganization.getDefaultOrganization(),
      // Order template with hidden "Cost details" currency and exchange rate fields
      orderTemplate: OrderTemplates.getDefaultOrderTemplate({
        additionalProperties: {
          templateName: `AT_C440067_OrderTemplate_${getRandomPostfix()}`,
          hiddenFields: {
            cost: {
              currency: true,
              currentExchangeRate: true,
              useSetExchangeRate: true,
              exchangeRate: true,
            },
          },
        },
      }),
      polTitle: `AT_C440067_POL_${getRandomPostfix()}`,
      editedPolTitle: `AT_C440067_POL_edited_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition 1: Order template with hidden fields
    OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);
    cy.getAcquisitionMethodsApi().then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    // Precondition 2: "Pending" order with one POL created using template from precondition #1
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;

      Orders.createOrderViaApi({
        ...NewOrder.getDefaultOrder({ vendorId: organizationId }),
        template: testData.orderTemplate.id,
      }).then((order) => {
        testData.order = order;

        // POL title is not selected from "Title look-up"
        OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            title: testData.polTitle,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
          }),
        );
      });
    });

    // Precondition 3: User with only required permissions is logged in
    cy.createTempUser([Permissions.uiOrdersCreate.gui, Permissions.uiOrdersEdit.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        // Precondition 4: User is on "Orders" app, "Orders" toggle is selected
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id, false);
    OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C440067 User is able to edit Order created from template with hidden fields in "Cost details" accordion (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C440067'] },
    () => {
      // Step 1: Go to Order from precondition #2
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Actions menu on Order details pane does NOT contain "Show hidden fields"
      OrderDetails.expandActionsDropdown();
      OrderDetails.checkActionsMenuContent([SHOW_HIDDEN_FIELDS], { shouldExist: false });

      // Step 3: Click on POL record in "PO lines" accordion
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();

      // Step 4: Exchange rate fields are NOT displayed in "Cost details" on POL details pane
      OrderLineDetails.checkCostDetailsFieldsAbsent(HIDDEN_EXCHANGE_RATE_FIELDS);

      // Step 5: Actions menu on PO line details pane does NOT contain "Show hidden fields"
      OrderLineDetails.expandActionsDropdown();
      OrderLineDetails.checActionsMenuContent([SHOW_HIDDEN_FIELDS], { shouldExist: false });

      // Step 6: Select "Edit" option, "Actions" menu does NOT contain "Show hidden fields"
      OrderLineDetails.expandActionsDropdown();
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.clickActionsButton();
      OrderLineEditForm.checkButtonsNotDisplayed([SHOW_HIDDEN_FIELDS]);

      // Step 7: "Currency" and exchange rate fields are NOT displayed
      OrderLineEditForm.checkCostDetailsFieldsAbsent([
        POLINE_DETAILS_FIELDS.CURRENCY,
        ...HIDDEN_EXCHANGE_RATE_FIELDS,
      ]);

      // Step 8: Edit "Title" field
      OrderLineEditForm.fillItemDetails({ title: testData.editedPolTitle });
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'title', conditions: { value: testData.editedPolTitle } },
      ]);

      // Step 9: Click on "Save & close" button
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.waitLoading();
      OrderLineDetails.checkItemDetailsSection([
        { key: POLINE_DETAILS_FIELDS.TITLE, value: testData.editedPolTitle },
      ]);

      // Step 10: Exchange rate fields are NOT displayed in "Cost details" on POL details pane
      OrderLineDetails.checkCostDetailsFieldsAbsent(HIDDEN_EXCHANGE_RATE_FIELDS);
    },
  );
});
