import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { ORDER_FORMAT_NAMES, ORDER_FORMAT_VALUES } from '../../../support/constants';
import Orders from '../../../support/fragments/orders/orders';
import OrderTemplateCategories from '../../../support/fragments/settings/orders/orderTemplateCategories';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const CATEGORIES_PANE_TITLE = 'Order template categories';
const CATEGORIES_FIELD_LABEL = 'Order template categories';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before('Create test data', () => {
      const postfix = getRandomPostfix();

      testData = {
        categories: [1, 2].map((categoryNumber) => ({
          ...OrderTemplateCategories.getDefaultOrderTemplateCategory(),
          name: `AT_C736702_Category_${categoryNumber}_${postfix}`,
        })),
        templateName: `AT_C736702_OrderTemplate_${postfix}`,
        copyName: null,
      };

      cy.getAdminToken();
      testData.categories.forEach((category) => {
        OrderTemplateCategories.createOrderTemplateCategoryViaApi(category);
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiOrdersSettingsView,
            CapabilitySets.uiOrdersSettingsOrderTemplatesCreate,
          ],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      [testData.templateName, testData.copyName].filter(Boolean).forEach((templateName) => {
        OrderTemplates.getOrderTemplateByNameViaApi(templateName).then((template) => {
          if (template) {
            OrderTemplates.deleteOrderTemplateViaApi(template.id);
          }
        });
      });
      testData.categories.forEach((category) => {
        OrderTemplateCategories.deleteOrderTemplateCategoryViaApi(category.id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C736702 Create and edit an order template for electronic order format with a specified template category (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C736702'] },
      () => {
        const [firstCategory, secondCategory] = testData.categories;

        // Step 1: Click "Order template categories" option on "Orders" pane
        SettingOrdersNavigationMenu.selectOrderTemplateCategories();
        OrderTemplateCategories.waitLoading();
        SettingsPane.checkPaneIsOpened(CATEGORIES_PANE_TITLE, 'Categories');
        SettingsPane.checkResultsTableColumns(['Name', 'Actions']);
        testData.categories.forEach(({ name }) => {
          SettingsPane.checkTableRow({
            record: name,
            cells: [{ column: 'Name', content: name }],
            actions: [],
          });
        });
        SettingsPane.checkAddNewBtnAbsent();

        // Step 2: Click "Order templates" option and click "New"
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
        OrderTemplates.clickNewOrderTemplateButton();
        OrderTemplateForm.assertInfoSectionFields({ templateName: '', categories: [] });

        // Step 3: Expand "Order template categories" dropdown
        OrderTemplateForm.checkCategoryOptions([
          { name: firstCategory.name, selected: false },
          { name: secondCategory.name, selected: false },
        ]);

        // Step 4: Select two options in "Order template categories" dropdown
        OrderTemplateForm.clickCategoryOptions([firstCategory.name, secondCategory.name]);
        OrderTemplateForm.assertInfoSectionFields({
          categories: [firstCategory.name, secondCategory.name],
        });
        OrderTemplateForm.checkCategoryOptions([
          { name: firstCategory.name, selected: true },
          { name: secondCategory.name, selected: true },
        ]);

        // Step 5: Remove one option by clicking minus "-" icon in the dropdown list
        OrderTemplateForm.clickCategoryOptions([secondCategory.name]);
        OrderTemplateForm.assertInfoSectionFields({ categories: [firstCategory.name] });
        OrderTemplateForm.checkCategoryOptions([
          { name: firstCategory.name, selected: true },
          { name: secondCategory.name, selected: false },
        ]);

        // Step 6: Fill "Template name", select "Electronic Resource" in "Order format"
        OrderTemplateForm.fillInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.fillPoLineDetailsFields({
          orderFormat: ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE,
        });
        cy.intercept('POST', '**/orders/order-templates').as('templateCreated');

        // Step 7: Click "Save" button
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Steps 8-9: Check payload and response of "POST" request to /orders/order-templates
        cy.wait('@templateCreated').then(({ request, response }) => {
          [request.body, response.body].forEach((template) => {
            expect(template).to.include({
              isPackage: false,
              templateName: testData.templateName,
              orderFormat: ORDER_FORMAT_VALUES.ELECTRONIC_RESOURCE,
            });
            expect(template.categoryIds).to.deep.equal([firstCategory.id]);
            expect(template.eresource).to.have.property('createInventory');
            expect(template).to.have.property('id');
            expect(template).to.not.have.property('physical');
          });
        });

        // Step 10: Click on created order template record
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.checkTemplateViewDetails({
          fields: [{ key: CATEGORIES_FIELD_LABEL, value: firstCategory.name }],
        });

        // Step 11: Edit: remove category, select blank "Order format", click "Save"
        OrderTemplates.openEditForm();
        OrderTemplateForm.removeCategory(firstCategory.name);
        OrderTemplateForm.fillPoLineDetailsFields({ orderFormat: '' });
        cy.intercept('PUT', '**/orders/order-templates/*').as('templateUpdated');
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 12: Check payload of "PUT" request to /orders/order-templates/{{template_UUID}}
        cy.wait('@templateUpdated').then(({ request }) => {
          expect(request.body).to.include({
            templateName: testData.templateName,
            isPackage: false,
          });
          expect(request.body).to.have.property('id');
          expect(request.body.categoryIds).to.deep.equal([]);
          expect(request.body).to.not.have.any.keys('physical', 'orderFormat');
        });

        // Step 13: Click on just edited order template record
        cy.intercept('GET', '**/orders/order-templates/*').as('templateFetched');
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.checkTemplateViewDetails({
          fields: [{ key: CATEGORIES_FIELD_LABEL, value: '-' }],
        });
        cy.wait('@templateFetched').then(({ response }) => {
          expect(response.body).to.not.have.any.keys('physical', 'orderFormat');
        });

        // Step 14: Edit: select several categories, click "Save"
        OrderTemplates.openEditForm();
        OrderTemplateForm.clickCategoryOptions([firstCategory.name, secondCategory.name]);
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 15: Open the template, click "Actions" -> "Duplicate" -> "Submit"
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.openDuplicateModal();
        OrderTemplates.submitDuplicateModal();
        OrderTemplateForm.waitLoading();
        OrderTemplateForm.getTemplateName().then((copyName) => {
          testData.copyName = copyName;
        });
        OrderTemplateForm.verifyDuplicatedTemplateTitle(testData.templateName);
        OrderTemplateForm.assertInfoSectionFields({
          categories: [firstCategory.name, secondCategory.name],
        });
      },
    );
  });
});
