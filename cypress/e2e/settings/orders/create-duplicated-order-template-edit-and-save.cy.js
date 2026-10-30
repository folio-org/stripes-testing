import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Orders from '../../../support/fragments/orders/orders';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

const DUPLICATE_NAME_ERROR =
  'The order template could not be saved because this template name already exists.';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before(() => {
      const postfix = getRandomPostfix();

      testData = {
        orderTemplate: OrderTemplates.getDefaultOrderTemplate({
          additionalProperties: {
            templateName: `AT_C380577_OrderTemplate_${postfix}`,
            templateCode: `AT_C380577_Code_${postfix}`,
            templateDescription: `AT_C380577_Description_${postfix}`,
          },
        }),
        editedDescription: `AT_C380577_EditedDescription_${postfix}`,
        duplicatedTemplateName: `AT_C380577_DuplicatedOrderTemplate_${postfix}`,
      };

      cy.getAdminToken();
      OrderTemplates.createOrderTemplateViaApi(testData.orderTemplate);

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

    after(() => {
      cy.getAdminToken();
      OrderTemplates.deleteOrderTemplateViaApi(testData.orderTemplate.id);
      OrderTemplates.getOrderTemplateByNameViaApi(testData.duplicatedTemplateName).then(
        (template) => {
          if (template) {
            OrderTemplates.deleteOrderTemplateViaApi(template.id);
          }
        },
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C380577 Create duplicated order template, edit and save it (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C380577'] },
      () => {
        // Step 1: Click "Order templates" option on the second "Orders" pane
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
        OrderTemplates.checkTemplateCreated(testData.orderTemplate.templateName);

        // Step 2: Click on one of the order templates
        OrderTemplates.selectTemplate(testData.orderTemplate.templateName);
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: false });

        // Step 3: Click "Expand all" button and note the template settings
        OrderTemplates.expandAll();
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: true });
        OrderTemplates.checkTemplateViewDetails({
          fields: [{ key: 'Description', value: testData.orderTemplate.templateDescription }],
        });

        // Step 4: Click "Actions" -> "Duplicate"
        OrderTemplates.openDuplicateModal();
        OrderTemplates.verifyDuplicateModalContent();

        // Step 5: Click "Submit" button
        OrderTemplates.submitDuplicateModal();
        OrderTemplateForm.waitLoading();
        OrderTemplateForm.verifyDuplicatedTemplateTitle(testData.orderTemplate.templateName);
        OrderTemplateForm.assertInfoSectionFields({
          templateCode: testData.orderTemplate.templateCode,
          templateDescription: testData.orderTemplate.templateDescription,
        });
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });

        // Step 6: Edit "Description" field in "Template information" accordion
        OrderTemplateForm.fillInfoSectionFields({
          templateDescription: testData.editedDescription,
        });
        OrderTemplateForm.assertInfoSectionFields({
          templateDescription: testData.editedDescription,
        });
        OrderTemplateForm.verifyFormButtons({ saveDisabled: false });

        // Step 7: Enter the name of an existing template and click "Save"
        OrderTemplateForm.fillInfoSectionFields({
          templateName: testData.orderTemplate.templateName,
        });
        OrderTemplateForm.clickSaveButton({ templateCreated: false });
        InteractorsTools.checkCalloutErrorMessage(DUPLICATE_NAME_ERROR);
        OrderTemplateForm.verifyDuplicatedTemplateTitle(testData.orderTemplate.templateName, {
          checkNameField: false,
        });

        // Step 8: Enter a unique name and click "Save"
        OrderTemplateForm.fillInfoSectionFields({
          templateName: testData.duplicatedTemplateName,
        });
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.waitLoading();
        OrderTemplates.checkTemplateCreated(testData.duplicatedTemplateName);

        // Step 9: Click on the created order template
        OrderTemplates.selectTemplate(testData.duplicatedTemplateName);
        OrderTemplates.expandAll();
        OrderTemplates.checkTemplateViewDetails({
          fields: [{ key: 'Description', value: testData.editedDescription }],
        });
      },
    );
  });
});
