import uuid from 'uuid';
import {
  Button,
  Checkbox,
  EditableListRow,
  MultiColumnListCell,
  NavListItem,
  Section,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import InteractorsTools from '../../../utils/interactorsTools';

const organizationsSettingsSection = Section({ id: 'settings-nav-pane' });
const enableBankingInformationCheckbox = Checkbox('Enable banking information');
const defaultCategories = {
  id: uuid(),
  value: `autotest_category_name_${getRandomPostfix()}`,
};
const defaultTypes = {
  id: uuid(),
  name: `autotest_type_name_${getRandomPostfix()}`,
  status: 'Active',
};
const trashIconButton = Button({ icon: 'trash' });
const editIconButton = Button({ icon: 'edit' });
function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}
export default {
  defaultCategories,
  defaultTypes,
  getDefaultOrganizationType() {
    return { id: uuid(), name: `autotest_type_name_${getRandomPostfix()}`, status: 'Active' };
  },
  waitLoadingOrganizationSettings: () => {
    cy.expect(organizationsSettingsSection.exists());
  },

  checkButtonNewInTypesIsDisabled: () => {
    cy.expect(
      Section({ id: 'controlled-vocab-pane' })
        .find(Button({ id: 'clickable-add-types' }))
        .absent(),
    );
  },

  checkButtonNewInCategoriesIsDisabled: () => {
    cy.expect(
      Section({ id: 'controlled-vocab-pane' })
        .find(Button({ id: 'clickable-add-categories' }))
        .absent(),
    );
  },

  selectCategories: () => {
    cy.do(NavListItem('Categories').click());
  },

  editCategory(categoryName, oldCategoryName) {
    cy.do(
      MultiColumnListCell({ content: oldCategoryName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(editIconButton).click());
        this.fillRequiredFields(categoryName);
      }),
    );
  },

  deleteCategory: (categoryName) => {
    cy.do(
      MultiColumnListCell({ content: categoryName.value }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([
          getEditableListRow(rowNumber).find(trashIconButton).click(),
          Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }).click(),
        ]);
      }),
    );
    InteractorsTools.checkCalloutMessage(
      `The category ${categoryName.value} was successfully deleted`,
    );
  },

  deleteType: (typeName) => {
    cy.do(
      MultiColumnListCell({ content: typeName.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([
          getEditableListRow(rowNumber).find(trashIconButton).click(),
          Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }).click(),
        ]);
      }),
    );
    InteractorsTools.checkCalloutMessage(`The type ${typeName.name} was successfully deleted`);
  },
  selectTypes: () => {
    cy.do(NavListItem('Types').click());
  },

  checkenableBankingInformationIfNeeded: () => {
    cy.expect(enableBankingInformationCheckbox.exists());
    cy.do(enableBankingInformationCheckbox.checkIfNotSelected());
    cy.get('#clickable-save-contact-person-footer').then(($btn) => {
      if (!$btn.is(':disabled')) {
        cy.wrap($btn).click();
      }
    });
    cy.wait(2000);
  },

  createCategoriesViaApi(categories) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'organizations-storage/categories',
        body: categories,
      })
      .then(({ body }) => body);
  },

  createTypesViaApi(types) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'organizations-storage/organization-types',
        body: types,
      })
      .then(({ body }) => body);
  },
  deleteOrganizationTypeViaApi(organizationTypeId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `organizations-storage/organization-types/${organizationTypeId}`,
    });
  },
};
