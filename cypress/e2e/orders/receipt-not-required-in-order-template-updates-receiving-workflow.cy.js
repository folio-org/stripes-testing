import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import OrderTemplateForm from '../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  ORDER_TEMPLATE_FORM_ACCORDION_LABELS,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_SELECTED,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';

describe('Orders', () => {
  const quantityPhysical = '1';
  const unitPrice = '10';
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      orderTemplate: {
        templateName: `AT_C692249_OrderTemplate_${getRandomPostfix()}`,
        id: null,
      },
      orderLineTitle: `AT_C692249_OrderLine_${getRandomPostfix()}`,
      location: {},
      poNumber: null,
      user: {},
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Locations.getViaApiAnyDefault(1)
      .then(([location]) => {
        testData.location = location;
      })
      .then(() => Organizations.createOrganizationViaApi(testData.organization))
      .then(() => {
        cy.createTempUser([
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiReceivingView.gui,
        ]);
      })
      .then((userProperties) => {
        testData.user = userProperties;

        // Create order template with "Receipt not required" receipt status via UI
        cy.loginAsAdmin({
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
        OrderTemplates.clickNewOrderTemplateButton();
        OrderTemplateForm.fillOrderTemplateFields({
          templateInformation: { templateName: testData.orderTemplate.templateName },
          poLineDetails: { receiptStatus: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
        });
        OrderTemplateForm.checkPoLineDetailsFields([
          {
            label: 'receiptStatus',
            conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
          },
          {
            label: 'checkinItems',
            conditions: {
              checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            },
          },
        ]);
        OrderTemplateForm.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.COST_DETAILS);
        OrderTemplateForm.selectCurrency('USD');
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.orderTemplate.templateName);
        OrderTemplates.getOrderTemplateByNameViaApi(testData.orderTemplate.templateName).then(
          (orderTemplate) => {
            testData.orderTemplate.id = orderTemplate.id;
          },
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false).then(() => {
      if (testData.poNumber) {
        Orders.getOrdersApi({ query: `poNumber=="${testData.poNumber}"` }).then((orders) => {
          if (orders?.length) {
            Orders.deleteOrderViaApi(orders[0].id);
          }
        });
      }
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineTitle);
      if (testData.orderTemplate.id) {
        OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
      }
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    "C692249 Setting receipt status in order template to 'Receipt not required'  updates receiving workflow when create POL using such template (thunderjet)",
    { tags: ['criticalPath', 'thunderjet', 'C692249'] },
    () => {
      // Step 1: Create an order using template from preconditions
      const OrderEditForm = Orders.clickCreateNewOrder();
      OrderEditForm.checkOrderFormContent();
      OrderEditForm.selectOrderTemplate(testData.orderTemplate.templateName);
      OrderEditForm.fillOrderInfoSectionFields({
        organizationName: testData.organization.name,
        orderType: ORDER_TYPES.ONE_TIME,
      });
      OrderEditForm.clickSaveButton();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      OrderDetails.checkOrderDetails({
        orderInformation: [
          { key: 'Vendor', value: testData.organization.name },
          { key: 'Order type', value: ORDER_TYPES.ONE_TIME },
        ],
      });

      // Step 2: Click "Actions" in "PO lines" accordion and select "Add PO line"
      const OrderLineEditForm = OrderDetails.selectAddPOLine();
      OrderLineEditForm.checkOrderLineDetailsSection([
        {
          label: 'receiptStatus',
          conditions: { checkedOptionText: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED },
        },
        {
          label: 'checkinItems',
          conditions: {
            checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            disabled: true,
          },
        },
      ]);

      // Step 3: Fill mandatory fields (Create inventory: "Instance, holding, item") and save
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: { title: testData.orderLineTitle },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
        },
        costDetails: {
          physicalUnitPrice: unitPrice,
          quantityPhysical,
        },
      });
      OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical }]);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineDetails.checkOrderLineDetails({
        itemDetails: [{ key: POLINE_DETAILS_FIELDS.TITLE, value: testData.orderLineTitle }],
        poLineInformation: [
          {
            key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS,
            value: RECEIPT_STATUS_SELECTED.RECEIPT_NOT_REQUIRED,
          },
          {
            key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
            value: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
          },
        ],
        locationDetails: {
          locations: [
            [{ key: POLINE_DETAILS_FIELDS.LOCATION_NAME, value: testData.location.name }],
          ],
        },
      });
      OrderLines.checkCreatedInventoryInPhysicalRecourceDetails(
        POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
      );
      OrderLines.getAssignedPOLNumber().then((polNumber) => {
        testData.poNumber = polNumber.split('-')[0];
      });

      // Step 4: Open order
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 5: Click POL, select "Receive" action, click the title on "Receiving" pane
      OrderDetails.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLines.receiveOrderLineViaActions();
      OrderLines.selectreceivedTitleName(testData.orderLineTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLineTitle);
      ReceivingDetails.verifyExpectedRecordsCount(0);
    },
  );
});
