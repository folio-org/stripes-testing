import CapabilitySets from '../../../support/dictionary/capabilitySets';
import {
  ORDER_FORMAT_NAMES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../../support/constants';
import Orders from '../../../support/fragments/orders/orders';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

// "Order format" dropdown has a blank option (text is a single space) in the order template form
const BINDERY_ORDER_FORMAT_OPTIONS = [
  ' ',
  ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
  ORDER_FORMAT_NAMES.PE_MIX,
];
const ALL_ORDER_FORMAT_OPTIONS = [
  ' ',
  ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE,
  ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
  ORDER_FORMAT_NAMES.PE_MIX,
  ORDER_FORMAT_NAMES.OTHER,
];

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before('Create test data', () => {
      testData = {
        templateName: `AT_C476762_OrderTemplate_${getRandomPostfix()}`,
      };

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [CapabilitySets.uiOrdersSettingsOrderTemplatesCreate],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      OrderTemplates.getOrderTemplateByNameViaApi(testData.templateName).then((template) => {
        if (template) {
          OrderTemplates.deleteOrderTemplateViaApi(template.id);
        }
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C476762 Check "Bindery active" checkbox behavior in Order template (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C476762'] },
      () => {
        // Step 1: Click "Orders" -> "Order templates" option
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();

        // Step 2: Click "New" button
        OrderTemplates.clickNewOrderTemplateButton();

        // Step 3: Fill in the "Template name" field with unique name
        OrderTemplateForm.fillInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.assertInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.verifyFormButtons({ saveDisabled: false });

        // Step 4: Click "Expand all"
        OrderTemplateForm.expandAll();
        OrderTemplateForm.verifyExpandCollapseAllButton({ expanded: true });

        // Step 5: Select "Physical resource" in "Order format" dropdown
        OrderTemplateForm.fillPoLineDetailsFields({
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        });
        OrderTemplateForm.checkPoLineDetailsFields([
          {
            label: 'orderFormat',
            conditions: { checkedOptionText: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE },
          },
        ]);

        // Step 6: Expand "Physical resource details" accordion
        OrderTemplateForm.checkPhysicalResourceDetailsFields([
          { label: 'createInventory', conditions: { disabled: false, hasValue: true } },
        ]);

        // Step 7: Check "Bindery active" checkbox
        OrderTemplateForm.clickBinderyActiveCheckbox();
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'binderyActive', conditions: { checked: true } },
          {
            label: 'checkinItems',
            conditions: {
              checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
              disabled: true,
            },
          },
        ]);
        OrderTemplateForm.checkPhysicalResourceDetailsFields([
          {
            label: 'createInventory',
            conditions: {
              checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
              disabled: true,
            },
          },
        ]);

        // Step 8: Click "Order format" dropdown
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'orderFormat', conditions: { optionsText: BINDERY_ORDER_FORMAT_OPTIONS } },
        ]);

        // Step 9: Pick "P/E mix" option in "Order format" dropdown
        OrderTemplateForm.fillPoLineDetailsFields({ orderFormat: ORDER_FORMAT_NAMES.PE_MIX });
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'orderFormat', conditions: { checkedOptionText: ORDER_FORMAT_NAMES.PE_MIX } },
          { label: 'binderyActive', conditions: { checked: true } },
          { label: 'checkinItems', conditions: { disabled: true } },
        ]);
        OrderTemplateForm.checkPhysicalResourceDetailsFields([
          { label: 'createInventory', conditions: { disabled: true } },
        ]);

        // Step 10: Click "Save" button
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 11: Click on the created order template, click "Expand all"
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.expandAll();
        OrderTemplates.checkTemplateViewDetails({
          fields: [
            { key: POLINE_DETAILS_FIELDS.ORDER_FORMAT, value: ORDER_FORMAT_NAMES.PE_MIX },
            {
              key: POLINE_DETAILS_FIELDS.BINDERY_ACTIVE,
              value: { checked: true, disabled: true },
              checkbox: true,
            },
            {
              key: POLINE_DETAILS_FIELDS.RECEIVING_WORKFLOW,
              value: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
            },
          ],
          physicalResourceDetails: [
            {
              key: POLINE_DETAILS_FIELDS.CREATE_INVENTORY,
              value: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
            },
          ],
        });

        // Step 12: Click "Actions" -> "Edit"
        OrderTemplates.openEditForm();
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'orderFormat', conditions: { checkedOptionText: ORDER_FORMAT_NAMES.PE_MIX } },
          { label: 'binderyActive', conditions: { checked: true } },
          { label: 'checkinItems', conditions: { disabled: true } },
        ]);
        OrderTemplateForm.checkPhysicalResourceDetailsFields([
          { label: 'createInventory', conditions: { disabled: true } },
        ]);

        // Step 13: Uncheck "Bindery active" checkbox
        OrderTemplateForm.clickBinderyActiveCheckbox();
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'binderyActive', conditions: { checked: false } },
          {
            label: 'checkinItems',
            conditions: {
              checkedOptionText: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
              disabled: false,
            },
          },
        ]);
        OrderTemplateForm.checkPhysicalResourceDetailsFields([
          {
            label: 'createInventory',
            conditions: {
              checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING_ITEM,
              disabled: false,
            },
          },
        ]);
        OrderTemplateForm.verifyFormButtons({ saveDisabled: false });

        // Step 14: Click "Order format" dropdown
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'orderFormat', conditions: { optionsText: ALL_ORDER_FORMAT_OPTIONS } },
        ]);

        // Step 15: Pick "Other" option in "Order format" dropdown
        OrderTemplateForm.fillPoLineDetailsFields({ orderFormat: ORDER_FORMAT_NAMES.OTHER });
        OrderTemplateForm.checkPoLineDetailsFields([
          { label: 'orderFormat', conditions: { checkedOptionText: ORDER_FORMAT_NAMES.OTHER } },
          { label: 'binderyActive', conditions: { disabled: true } },
          { label: 'checkinItems', conditions: { disabled: false } },
        ]);
        // "Other resource details" accordion replaces "Physical resource details"
        OrderTemplateForm.checkOtherResourceDetailsFields([
          { label: 'createInventory', conditions: { disabled: false } },
        ]);

        // Step 16: Switch "Receiving workflow" to "Synchronized order and receipt quantity",
        // switch "Create inventory" to other than "Instance, Holding, Item"
        OrderTemplateForm.fillPoLineDetailsFields({
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
        });
        OrderTemplateForm.fillOtherResourceDetailsFields({
          createInventory: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING,
        });
        OrderTemplateForm.checkPoLineDetailsFields([
          {
            label: 'checkinItems',
            conditions: {
              checkedOptionText: RECEIVING_WORKFLOW_NAMES.SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY,
            },
          },
          { label: 'binderyActive', conditions: { disabled: true } },
        ]);
        OrderTemplateForm.checkOtherResourceDetailsFields([
          {
            label: 'createInventory',
            conditions: { checkedOptionText: POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING },
          },
        ]);

        // Step 17: Pick "Physical resource" option in "Order format" dropdown
        OrderTemplateForm.fillPoLineDetailsFields({
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
        });
        OrderTemplateForm.checkPoLineDetailsFields([
          {
            label: 'orderFormat',
            conditions: { checkedOptionText: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE },
          },
          { label: 'binderyActive', conditions: { checked: false, disabled: false } },
          { label: 'checkinItems', conditions: { disabled: false } },
        ]);
        OrderTemplateForm.checkPhysicalResourceDetailsFields([
          { label: 'createInventory', conditions: { disabled: false } },
        ]);

        // Step 18: Click "Save" button
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);
      },
    );
  });
});
