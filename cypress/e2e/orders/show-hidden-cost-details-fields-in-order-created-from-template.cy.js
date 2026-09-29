import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  CURRENCIES,
  MATERIAL_TYPE_NAMES,
  NO_VALUE,
  ORDER_FORMAT_NAMES,
  ORDER_TYPES,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OrderEditForm from '../../support/fragments/orders/orderEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderTemplates } from '../../support/fragments/settings/orders';
import OrderTemplateForm from '../../support/fragments/settings/orders/orderTemplateForm';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const UNIT_PRICE = '10';
  const QUANTITY = '1';
  const EXCHANGE_RATE = '4';
  // Currency not supported by the ECB exchange rate provider
  const SELECTED_CURRENCY = { option: CURRENCIES.AMD, code: 'AMD' };
  const COST_DETAILS_VISIBILITY_FIELDS = [
    'cost.listUnitPrice',
    'cost.quantityPhysical',
    'cost.additionalCost',
    'cost.currency',
    'cost.currentExchangeRate',
    'cost.useSetExchangeRate',
    'cost.exchangeRate',
    'cost.listUnitPriceElectronic',
    'cost.quantityElectronic',
    'cost.discount',
    'cost.discountType',
  ];
  const HIDDEN_FIELDS = [
    'cost.currency',
    'cost.currentExchangeRate',
    'cost.useSetExchangeRate',
    'cost.exchangeRate',
  ];
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
      orderTemplate: OrderTemplates.getDefaultOrderTemplate({
        additionalProperties: {
          templateName: `AT_C440059_OrderTemplate_${getRandomPostfix()}`,
          // No currency in template: currency is selected manually on POL
          cost: {},
        },
      }),
      polTitle: `AT_C440059_POL_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition 1: Vendor organization with no currencies specified
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    // Precondition 2: Order template with any properties
    OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });

    // Precondition 3: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui,
      Permissions.uiOrdersShowAllHiddenFields.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is on "Settings" -> "Orders" -> "Order templates"
      cy.login(userProperties.username, userProperties.password, {
        path: SettingsMenu.ordersOrderTemplatesPath,
        waiter: OrderTemplates.waitLoading,
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
    'C440059 User with "Orders: Show all hidden fields" permission is able to see and populate fields in "Cost details" accordion of Order created from template (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C440059'] },
    () => {
      // Step 1: Click on Order template from precondition #2
      OrderTemplates.selectTemplate(testData.orderTemplate.templateName);

      // Step 2: Click on "Actions" button and select "Edit" option
      OrderTemplates.openEditForm();

      // Step 3: Expand "Cost details" accordion, fields have "eye" icon next to them
      OrderTemplateForm.expandAccordion('Cost details');

      COST_DETAILS_VISIBILITY_FIELDS.forEach((fieldName) => {
        OrderTemplateForm.verifyFieldVisibilityControl(fieldName, { hidden: false });
      });

      // Step 4: Click on "eye" icon next to currency and exchange rate fields
      HIDDEN_FIELDS.forEach((fieldName) => {
        OrderTemplateForm.toggleFieldVisibilityIcon(fieldName);
        OrderTemplateForm.verifyFieldVisibilityControl(fieldName, { hidden: true });
      });

      // Step 5: Click on "Save" button
      OrderTemplateForm.clickSaveButton();

      // Step 6: Go to "Orders" app, toggle is set to "Orders"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();

      // Step 7: Click on "Actions" button and select "New" option
      Orders.clickCreateNewOrder();

      // Step 8: Select Template name from precondition #2 in "Template name" dropdown
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);
      OrderEditForm.verifySelectedOrderTemplate(testData.orderTemplate.templateName);

      // Step 9: Fill in "Vendor" and "Order type" mandatory fields
      OrderEditForm.selectVendorByName(testData.organization.name);
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
      OrderEditForm.verifyOrderInformationSection([
        { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
      ]);

      // Step 10: Click on "Save & close" button
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();

      // Step 11: Click on "Actions" button on "PO lines" accordion and select "Add PO line" option
      OrderDetails.selectAddPOLine();

      // Step 12: "Currency" is displayed, exchange rate fields are NOT displayed
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { visible: true } },
      ]);
      OrderLineEditForm.checkCostDetailsFieldsAbsent(HIDDEN_EXCHANGE_RATE_FIELDS);

      // Step 13: Click on "Actions" button and select "Show hidden fields" option
      OrderLineEditForm.clickActionsButton();
      OrderLineEditForm.clickShowHiddenFieldsAction();
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { visible: true } },
        { label: 'currentExchangeRate', conditions: { value: NO_VALUE } },
        { label: 'useSetExchangeRate', conditions: { visible: true } },
        { label: 'exchangeRate', conditions: { visible: true } },
      ]);

      // Step 14: Fill in the mandatory fields on "Add PO line" page
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.polTitle },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          materialType: MATERIAL_TYPE_NAMES.TEXT,
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        },
        costDetails: {
          physicalUnitPrice: UNIT_PRICE,
          quantityPhysical: QUANTITY,
        },
      });
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown();
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: QUANTITY }]);

      // Step 15: Select currency not supported by ECB provider and check "Use set exchange rate"
      OrderLines.selectCurrency(SELECTED_CURRENCY.option);
      OrderLineEditForm.fillCostDetails({ useSetExchangeRate: true });
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { singleValue: SELECTED_CURRENCY.option } },
        { label: 'useSetExchangeRate', conditions: { checked: true } },
        { label: 'exchangeRate', conditions: { readOnly: false, required: true } },
      ]);

      // Step 16: Populate the "Set exchange rate" field with number not equal to 1
      OrderLines.setExchangeRate(EXCHANGE_RATE, { clickCheckbox: false });
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'exchangeRate', conditions: { value: EXCHANGE_RATE } },
      ]);

      // Step 17: Click on "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();

      // Step 18: "Currency" and "Exchange rate" are displayed with values from steps 15-16
      OrderLineDetails.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.CURRENCY, value: SELECTED_CURRENCY.code },
        { key: POLINE_DETAILS_FIELDS.EXCHANGE_RATE, value: EXCHANGE_RATE },
      ]);
    },
  );
});
