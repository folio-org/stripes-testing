import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { ORDER_TYPES } from '../../../support/constants';
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
const RENEWAL_INTERVAL = '30';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before('Create test data', () => {
      const postfix = getRandomPostfix();

      testData = {
        existingTemplate: OrderTemplates.getDefaultOrderTemplate({
          additionalProperties: { templateName: `AT_C889745_ExistingTemplate_${postfix}` },
        }),
        templateName: `AT_C889745_OrderTemplate_${postfix}`,
      };

      cy.getAdminToken();
      OrderTemplates.createOrderTemplateViaApi(testData.existingTemplate);

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
      OrderTemplates.deleteOrderTemplateViaApi(testData.existingTemplate.id);
      OrderTemplates.getOrderTemplateByNameViaApi(testData.templateName).then((template) => {
        if (template) {
          OrderTemplates.deleteOrderTemplateViaApi(template.id);
        }
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C889745 Ongoing order related fields appears for Ongoing order type and are not populated after switching order type in the template (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C889745'] },
      () => {
        // Step 1: Click "New" button on the "Order templates" pane
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
        OrderTemplates.clickNewOrderTemplateButton();
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });
        OrderTemplateForm.assertOngoingOrderSectionAbsent();

        // Step 2: Fill "Template name" field with already existing order template name
        OrderTemplateForm.fillInfoSectionFields({
          templateName: testData.existingTemplate.templateName,
        });
        OrderTemplateForm.assertInfoSectionFields({
          templateName: testData.existingTemplate.templateName,
        });
        OrderTemplateForm.verifyFormButtons({ saveDisabled: false });

        // Step 3: Click "Save" button
        OrderTemplateForm.clickSaveButton({ templateCreated: false });
        InteractorsTools.checkCalloutErrorMessage(DUPLICATE_NAME_ERROR);
        InteractorsTools.dismissCallout(DUPLICATE_NAME_ERROR);
        OrderTemplateForm.waitLoading();

        // Step 4: Enter unique order template name, click "Expand all"
        OrderTemplateForm.fillInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.expandAll();
        OrderTemplateForm.verifyExpandCollapseAllButton({ expanded: true });
        OrderTemplateForm.assertInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.verifyFormFieldsEmpty({ except: ['templateName'] });

        // Step 5: Click "Save" button
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 6: Click on created order template, click "Expand all"
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.expandAll();
        OrderTemplates.verifyExpandCollapseAllButton({ expanded: true });
        // "Discount" is always displayed as "$0.00" when not set
        OrderTemplates.verifyTemplateViewFieldsEmpty({ except: ['Template name', 'Discount'] });

        // Step 7: Click "Actions" -> "Edit"
        OrderTemplates.openEditForm();
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });

        // Step 8: Select "One-time" in "Order type" dropdown
        OrderTemplateForm.fillPoInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
        OrderTemplateForm.checkPoInfoSectionFields([
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
        ]);
        OrderTemplateForm.assertOngoingOrderSectionAbsent();

        // Step 9: Click "Save" button
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 10: Click on created order template, click "Actions" -> "Edit"
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.openEditForm();
        OrderTemplateForm.assertInfoSectionFields({ templateName: testData.templateName });

        // Step 11: Select "Ongoing" in "Order type" dropdown
        OrderTemplateForm.fillPoInfoSectionFields({ orderType: ORDER_TYPES.ONGOING });
        OrderTemplateForm.checkPoInfoSectionFields([
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONGOING } },
        ]);
        OrderTemplateForm.assertOngoingOrderSectionPresent();

        // Step 12: Check "Subscription", fill "Renewal interval", click "Save"
        OrderTemplateForm.fillOngoingOrderFields({
          isSubscription: true,
          renewalInterval: RENEWAL_INTERVAL,
        });
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 13: Click on created order template, click "Actions" -> "Edit"
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.openEditForm();
        OrderTemplateForm.assertInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.checkPoInfoSectionFields([
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONGOING } },
        ]);
        OrderTemplateForm.checkOngoingOrderFields({
          isSubscription: true,
          renewalInterval: RENEWAL_INTERVAL,
        });

        // Step 14: Select "One-time" in "Order type" dropdown
        OrderTemplateForm.fillPoInfoSectionFields({ orderType: ORDER_TYPES.ONE_TIME });
        OrderTemplateForm.checkPoInfoSectionFields([
          { label: 'orderType', conditions: { value: ORDER_TYPES.ONE_TIME_API } },
        ]);
        OrderTemplateForm.assertOngoingOrderSectionAbsent();

        // Step 15: Click "Save" button
        cy.intercept('PUT', '**/orders/order-templates/*').as('templateUpdated');
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 16: Check payload of "PUT" request to /orders/order-templates
        cy.wait('@templateUpdated').then(({ request }) => {
          expect(request.body).to.include({ orderType: ORDER_TYPES.ONE_TIME_API });
          expect(request.body).to.not.have.property('ongoing');
        });
      },
    );
  });
});
