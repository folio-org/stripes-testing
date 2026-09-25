import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  CURRENCIES,
  DEFAULT_LOCALE_OBJECT,
  MATERIAL_TYPE_NAMES,
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
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const UNIT_PRICE = '10';
  const QUANTITY = '1';
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
          templateName: `AT_C440064_OrderTemplate_${getRandomPostfix()}`,
          // No currency in template: system default currency is selected manually on POL
          cost: {},
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
      polTitle: `AT_C440064_POL_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    // Precondition 1: Order template with hidden fields
    OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);
    // Precondition 2: Vendor organization with no currencies specified
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
    });

    // Precondition 3: User with required permissions is logged in
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
    Orders.getOrdersApi({ query: `vendor=="${testData.organization.id}"` }).then((orders) => {
      orders.forEach((order) => Orders.deleteOrderViaApi(order.id, false));
    });
    OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C440064 User is able to create Order from template with hidden fields in "Cost details" accordion (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C440064'] },
    () => {
      // Step 1: Click on "Actions" button and select "New" option
      Orders.clickCreateNewOrder();

      // Step 2: Select Template name from precondition #1 in "Template name" dropdown
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);
      OrderEditForm.verifySelectedOrderTemplate(testData.orderTemplate.templateName);

      // Step 3: Fill in "Vendor" and "Order type" mandatory fields
      OrderEditForm.selectVendorByName(testData.organization.name);
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
      OrderEditForm.verifyOrderInformationSection([
        { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
      ]);

      // Step 4: Click on "Save & close" button
      OrderEditForm.clickSaveButton();
      OrderDetails.waitLoading();

      // Step 5: Click on "Actions" button on "PO lines" accordion and select "Add PO line" option
      OrderDetails.selectAddPOLine();

      // Step 6: "Currency" is displayed, exchange rate fields are NOT displayed
      OrderLineEditForm.checkCostDetailsSection([
        { label: 'currency', conditions: { visible: true } },
      ]);
      OrderLineEditForm.checkCostDetailsFieldsAbsent(HIDDEN_EXCHANGE_RATE_FIELDS);

      // Step 7: Fill in the mandatory fields and select system default currency
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
      OrderLines.selectCurrency(CURRENCIES.USD);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown();
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: QUANTITY }]);

      // Step 8: Click on "Save & close" button
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.waitLoading();

      // Step 9: Exchange rate fields are NOT displayed, "Currency" is system default currency
      OrderLineDetails.checkCostDetailsFieldsAbsent(HIDDEN_EXCHANGE_RATE_FIELDS);
      OrderLineDetails.checkCostDetailsSection([
        { key: POLINE_DETAILS_FIELDS.CURRENCY, value: DEFAULT_LOCALE_OBJECT.currency },
      ]);
    },
  );
});
