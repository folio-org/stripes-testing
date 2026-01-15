import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import OrderTemplateCategories from '../../../support/fragments/settings/orders/orderTemplateCategories';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import settingsMenu from '../../../support/fragments/settingsMenu';

describe('Settings (Orders) - Order template categories', () => {
  let user;
  const categoryA = OrderTemplateCategories.getDefaultOrderTemplateCategory();
  const categoryB = OrderTemplateCategories.getDefaultOrderTemplateCategory();
  const { name: uiCategoryName } = OrderTemplateCategories.getDefaultOrderTemplateCategory();
  const editedCategory = `${uiCategoryName}-edited`;
  const orderTemplate = OrderTemplates.getDefaultOrderTemplate({
    additionalProperties: {
      categoryIds: [categoryB.id],
    },
  });

  before('Setup data via API and login', () => {
    cy.getAdminToken();
    OrderTemplateCategories.createOrderTemplateCategoryViaApi(categoryA);
    OrderTemplateCategories.createOrderTemplateCategoryViaApi(categoryB);
    OrderTemplates.createOrderTemplateViaApi(orderTemplate);

    cy.createTempUser([permissions.uiSettingsOrdersCanViewAndEditAllSettings.gui]).then(
      (userProps) => {
        user = userProps;
        cy.login(user.username, user.password, {
          path: settingsMenu.ordersTemplateCategoriesPath,
          waiter: OrderTemplateCategories.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userId);
    });

    OrderTemplates.deleteOrderTemplateViaApi(orderTemplate.id);
    OrderTemplateCategories.deleteOrderTemplateCategoryViaApi(categoryA.id);
    OrderTemplateCategories.deleteOrderTemplateCategoryViaApi(categoryB.id);
  });

  it(
    'C736696 Create, edit and delete PO template category in Settings (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C736696'] },
    () => {
      OrderTemplateCategories.startNewCategory();
      OrderTemplateCategories.triggerEmptyValidation();
      OrderTemplateCategories.fillCategoryName(uiCategoryName);
      OrderTemplateCategories.saveCategory(uiCategoryName);
      OrderTemplateCategories.editCategory(uiCategoryName, editedCategory);
      OrderTemplateCategories.cancelEdit(editedCategory, 'temp-change');
      OrderTemplateCategories.attemptDuplicateCategory(editedCategory);
      SettingOrdersNavigationMenu.selectApprovals();
      OrderTemplateCategories.selectActionInUnsavedModal('Keep editing');
      SettingOrdersNavigationMenu.selectApprovals();
      OrderTemplateCategories.selectActionInUnsavedModal('Close without saving');
      SettingOrdersNavigationMenu.selectOrderTemplateCategories();
      OrderTemplateCategories.waitLoading();
      OrderTemplateCategories.deleteCategory(editedCategory, 'Cancel');
      OrderTemplateCategories.deleteCategory(editedCategory);
      OrderTemplateCategories.attemptDeleteInUseCategory(categoryB.name);
    },
  );
});
