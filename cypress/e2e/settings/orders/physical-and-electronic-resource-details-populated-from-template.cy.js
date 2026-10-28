import CapabilitySets from '../../../support/dictionary/capabilitySets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  CURRENCIES,
  ORDER_FORMAT_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  RECEIVING_WORKFLOW_NAMES,
} from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import OrderEditForm from '../../../support/fragments/orders/orderEditForm';
import OrderLineDetails from '../../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

const ACTIVATION_DUE_DAYS = 10;
const USER_LIMIT = '3';
const RESOURCE_URL = 'https://test.com';
const UNIT_PRICE = '10';
const QUANTITY = '1';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before('Create test data', () => {
      const postfix = getRandomPostfix();
      const today = new Date();
      const futureDate = DateTools.getFutureWeekDateObj();
      // Template "Activation due" days are added to the order created date in the POL form
      const activationDueDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + ACTIVATION_DUE_DAYS,
      );
      const futureDateForApi = `${DateTools.getFormattedDate({ date: futureDate })}T12:00:00.000+00:00`;

      testData = {
        organization: {
          ...NewOrganization.getDefaultOrganization(),
          name: `AT_C829887_Organization_${postfix}`,
        },
        templateName: `AT_C829887_OrderTemplate_${postfix}`,
        orderLineTitle: `AT_C829887_OrderLine_${postfix}`,
        futureDateInForm: DateTools.getFormattedDate({ date: futureDate }, 'MM/DD/YYYY'),
        activationDueDateInForm: DateTools.getFormattedDate(
          { date: activationDueDate },
          'MM/DD/YYYY',
        ),
        poNumbers: [],
      };

      cy.getAdminToken();
      Organizations.createOrganizationViaApi(testData.organization);
      cy.getBookMaterialType()
        .then((materialType) => {
          testData.materialType = materialType;

          OrderTemplates.createOrderTemplateViaApi({
            templateName: testData.templateName,
            orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
            isPackage: false,
            donorOrganizationIds: [],
            physical: {
              materialSupplier: testData.organization.id,
              receiptDue: futureDateForApi,
              expectedReceiptDate: futureDateForApi,
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
              materialType: materialType.id,
            },
            eresource: {
              accessProvider: testData.organization.id,
              materialType: materialType.id,
              activationDue: ACTIVATION_DUE_DAYS,
              expectedActivation: futureDateForApi,
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE,
              userLimit: Number(USER_LIMIT),
              activated: true,
              trial: true,
              resourceUrl: RESOURCE_URL,
            },
          });
        })
        .then((template) => {
          testData.templateId = template.id;

          cy.createTempUser([]).then((userProperties) => {
            testData.user = userProperties;

            cy.assignCapabilitiesToExistingUser(
              testData.user.userId,
              [],
              [
                CapabilitySets.uiOrdersOrdersCreate,
                CapabilitySets.uiOrdersSettingsOrderTemplatesEdit,
              ],
            );

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.poNumbers.forEach((poNumber) => Orders.deleteOrderByOrderNumberViaApi(poNumber));
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.orderLineTitle);
      OrderTemplates.deleteOrderTemplateViaApi(testData.templateId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C829887 Physical and electronic resource details are populated correctly from the order template (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C829887'] },
      () => {
        // Step 1: Click "Actions" on "Orders" pane and select "New"
        Orders.clickCreateNewOrder();
        OrderEditForm.verifySelectedOrderTemplate('');

        // Step 2: Select order template, fill all mandatory fields, click "Save & close"
        OrderEditForm.selectOrderTemplate(testData.templateName);
        OrderEditForm.verifySelectedOrderTemplate(testData.templateName);
        OrderEditForm.selectVendorByName(testData.organization.name);
        OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
        OrderEditForm.verifyOrderInformationSection([
          { label: 'vendor', conditions: { value: testData.organization.name } },
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
        ]);
        OrderEditForm.clickSaveButton();
        OrderDetails.waitLoading();

        // Step 3: Click "Actions" in "PO lines" accordion and select "Add PO line"
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.checkOrderLineDetailsSection([
          { label: 'orderFormat', conditions: { checkedOptionText: ORDER_FORMAT_NAMES.PE_MIX } },
        ]);
        OrderLineEditForm.checkPhysicalResourceDetailsSection([
          { label: 'materialSupplier', conditions: { value: testData.organization.name } },
          { label: 'receiptDue', conditions: { value: testData.futureDateInForm } },
          { label: 'expectedReceiptDate', conditions: { value: testData.futureDateInForm } },
          {
            label: 'createInventory',
            conditions: { checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE },
          },
          { label: 'materialType', conditions: { checkedOptionText: testData.materialType.name } },
        ]);
        OrderLineEditForm.checkEResourcesDetailsSection([
          { label: 'accessProvider', conditions: { value: testData.organization.name } },
          { label: 'materialType', conditions: { checkedOptionText: testData.materialType.name } },
          { label: 'activationDue', conditions: { value: testData.activationDueDateInForm } },
          { label: 'expectedActivation', conditions: { value: testData.futureDateInForm } },
          {
            label: 'createInventory',
            conditions: { checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE },
          },
          { label: 'userLimit', conditions: { value: USER_LIMIT } },
          { label: 'activated', conditions: { checked: true } },
          { label: 'trial', conditions: { checked: true } },
          { label: 'resourceUrl', conditions: { value: RESOURCE_URL } },
        ]);

        // Step 4: Fill all other mandatory fields and click "Save & close"
        OrderLineEditForm.fillOrderLineFields({
          itemDetails: { title: testData.orderLineTitle },
          poLineDetails: {
            acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          },
          costDetails: {
            physicalUnitPrice: UNIT_PRICE,
            quantityPhysical: QUANTITY,
            electronicUnitPrice: UNIT_PRICE,
            quantityElectronic: QUANTITY,
          },
        });
        OrderLines.selectCurrency(CURRENCIES.USD);
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineDetails.waitLoading();
        OrderLines.getAssignedPOLNumber().then((polNumber) => {
          testData.poNumbers.push(polNumber.split('-')[0]);
        });

        // Step 5: Open the order template and expand "E-resources details" accordion
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        OrderTemplates.goToTemplatesFromOrders();
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.expandAll();
        OrderTemplates.checkTemplateViewDetails({
          fields: [{ key: 'Activation due', value: String(ACTIVATION_DUE_DAYS) }],
        });

        // Step 6: Edit: "Electronic resource" format, another "Create inventory", clear "Activation due"
        OrderTemplates.openEditForm();
        OrderTemplateForm.fillOrderTemplateFields({
          poLineDetails: { orderFormat: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE },
          eresourceDetails: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.NONE,
            activationDue: '',
          },
        });
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.expandAll();
        OrderTemplates.checkTemplateViewDetails({
          fields: [
            { key: 'Order format', value: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE },
            { key: 'Create inventory', value: POL_CREATE_INVENTORY_SETTINGS_VIEW.NONE },
            { key: 'Activation due', value: '-' },
          ],
        });

        // Step 7: Create an order from the template
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        OrderLineDetails.backToOrderDetails();
        OrderDetails.closeOrderDetails();
        Orders.resetFilters();
        Orders.clickCreateNewOrder();
        OrderEditForm.selectOrderTemplate(testData.templateName);
        OrderEditForm.verifySelectedOrderTemplate(testData.templateName);
        OrderEditForm.selectVendorByName(testData.organization.name);
        OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
        OrderEditForm.verifyOrderInformationSection([
          { label: 'vendor', conditions: { value: testData.organization.name } },
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
        ]);
        OrderEditForm.clickSaveButton();
        OrderDetails.waitLoading();

        // Step 8: Click "Actions" in "PO lines" accordion and select "Add PO line"
        OrderDetails.selectAddPOLine();
        OrderLineEditForm.checkOrderLineDetailsSection([
          {
            label: 'orderFormat',
            conditions: { checkedOptionText: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE },
          },
        ]);
        OrderLineEditForm.checkEResourcesDetailsSection([
          { label: 'accessProvider', conditions: { value: testData.organization.name } },
          { label: 'materialType', conditions: { checkedOptionText: testData.materialType.name } },
          { label: 'activationDue', conditions: { value: '' } },
          { label: 'expectedActivation', conditions: { value: testData.futureDateInForm } },
          {
            label: 'createInventory',
            conditions: { checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.NONE },
          },
          { label: 'userLimit', conditions: { value: USER_LIMIT } },
          { label: 'activated', conditions: { checked: true } },
          { label: 'trial', conditions: { checked: true } },
          { label: 'resourceUrl', conditions: { value: RESOURCE_URL } },
        ]);

        // Step 9: Fill all other mandatory fields and click "Save & close"
        OrderLineEditForm.fillOrderLineFields({
          itemDetails: { title: testData.orderLineTitle },
          poLineDetails: {
            acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE,
            receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
          },
          costDetails: { electronicUnitPrice: UNIT_PRICE, quantityElectronic: QUANTITY },
        });
        OrderLines.selectCurrency(CURRENCIES.USD);
        OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
        OrderLineDetails.waitLoading();
        OrderLines.getAssignedPOLNumber().then((polNumber) => {
          testData.poNumbers.push(polNumber.split('-')[0]);
        });
      },
    );
  });
});
