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
const saveButton = Button('Save');
const newCategory = Button('+ New');
const defaultCategories = {
  id: uuid(),
  value: `autotest_category_name_${getRandomPostfix()}`,
};
const defaultTypes = {
  id: uuid(),
  name: `autotest_type_name_${getRandomPostfix()}`,
  status: 'Active',
};
const defaultAccountTypes = {
  id: uuid(),
  name: `autotest_type_name_${getRandomPostfix()}`,
};
const trashIconButton = Button({ icon: 'trash' });
const editIconButton = Button({ icon: 'edit' });

function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  defaultCategories,
  defaultTypes,
  defaultAccountTypes,
  getDefaultOrganizationType() {
    return { id: uuid(), name: `autotest_type_name_${getRandomPostfix()}`, status: 'Active' };
  },
  waitLoadingOrganizationSettings: () => {
    cy.expect(organizationsSettingsSection.exists());
  },

  checkButtonNewInTypesIsAbsent() {
    cy.expect(
      Section({ id: 'controlled-vocab-pane' })
        .find(Button({ id: 'clickable-add-types' }))
        .absent(),
    );
  },

  checkButtonNewInCategoriesIsAbsent() {
    cy.expect(
      Section({ id: 'controlled-vocab-pane' })
        .find(Button({ id: 'clickable-add-categories' }))
        .absent(),
    );
  },

  selectCategories: () => {
    cy.do(NavListItem('Categories').click());
    cy.wait(2000);
  },

  selectBankingInformation: () => {
    cy.do(NavListItem('Banking information').click());
  },

  enableBankingInformation: () => {
    cy.do(enableBankingInformationCheckbox.click());
    cy.wait(4000);
    cy.do(saveButton.click());
    cy.wait(4000);
  },

  uncheckenableBankingInformationIfChecked: () => {
    cy.expect(enableBankingInformationCheckbox.exists());
    cy.do(enableBankingInformationCheckbox.uncheckIfSelected());
    cy.get('#clickable-save-contact-person-footer').then(($btn) => {
      if (!$btn.is(':disabled')) {
        cy.wrap($btn).click();
      }
    });
    cy.wait(2000);
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

  ensureAccountTypesExist: (number) => {
    cy.get('[data-row-index^="row-"]', { timeout: 5000 }).should(($rows) => {
      expect($rows.length).to.be.at.least(number);
    });
  },

  ensureCategoriesExist: (number) => {
    cy.get('#editList-categories [data-row-index^="row-"]', { timeout: 5000 })
      .its('length')
      .should('be.gte', number);
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

  clickNewCategoriesButton() {
    cy.do(newCategory.click());
  },

  fillCategoryName(name) {
    cy.get('#editList-categories').find('input[type="text"]').clear().type(name)
      .blur();
  },

  saveCategoryChanges() {
    cy.do(Button('Save').click());
  },

  checkCategoriesTableContent(typeName) {
    const grid = '#editList-categories';
    cy.get(`${grid} [role="row"][aria-rowindex]:not([aria-rowindex="1"])`)
      .filter((_, row) => {
        const nameCell = row.querySelector('[role="gridcell"]');
        return nameCell && nameCell.textContent.trim() === typeName;
      })
      .should('have.length', 1);
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

  selectAccountTypes: () => {
    cy.do(NavListItem('Account types').click());
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
  getAccountTypeViaApi(name) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'organizations-storage/banking-account-types',
        searchParams: {
          query: `name=="${name}"`,
        },
      })
      .then(({ body }) => {
        return body;
      });
  },
  createAccountTypesViaApi(types) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'organizations-storage/banking-account-types',
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
  deleteOrganizationCategoriesViaApi(organizationCategoryId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `organizations-storage/categories/${organizationCategoryId}`,
    });
  },
  deleteOrganizationAccountTypeViaApi(organizationAccountTypeId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `organizations-storage/banking-account-types/${organizationAccountTypeId}`,
    });
  },

  checkBankingAccountTypesTableContent(typeName) {
    const grid = '#editList-bankingAccountTypes';
    cy.get(`${grid} [role="row"][aria-rowindex]:not([aria-rowindex="1"])`)
      .filter((_, row) => {
        const nameCell = row.querySelector('[role="gridcell"]');
        return nameCell && nameCell.textContent.trim() === typeName;
      })
      .should('have.length', 1);
  },

  checkNewAccountTypeButtonExists() {
    cy.expect(Button({ id: 'clickable-add-bankingAccountTypes' }).exists());
  },

  clickEditAccountType(typeName) {
    cy.do(
      MultiColumnListCell({ content: typeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(editIconButton).click());
      }),
    );
  },

  checkEditFieldState(typeName) {
    cy.get('#editList-bankingAccountTypes')
      .find('input[type="text"]')
      .should('have.value', typeName);
    cy.get('[data-type-button="cancel"]').should('be.enabled');
    cy.get('button[id^="clickable-save-bankingAccountTypes-"]').should('be.disabled');
  },

  clearAccountTypeField(typeName) {
    const grid = '#editList-bankingAccountTypes';
    cy.get(`${grid} input[type="text"]`)
      .should('be.enabled')
      .should('have.value', typeName)
      .clear({ force: true })
      .blur();
    cy.get(`${grid} input[type="text"]`).should('have.attr', 'aria-invalid', 'true');
    cy.get(`${grid} [class*="feedbackError"]`)
      .should('be.visible')
      .and('contain.text', 'Please fill this in to continue');
    cy.get('button[id^="clickable-save-bankingAccountTypes-"]').should('be.disabled');
  },

  fillAccountTypeName(name) {
    cy.get('#editList-bankingAccountTypes').find('input[type="text"]').clear().type(name)
      .blur();
  },

  clickOutsideAccountTypeField() {
    cy.get('#editList-bankingAccountTypes').find('input[type="text"]').blur();
  },

  checkErrorMessage(errorText = 'Please fill this in to continue') {
    const grid = '#editList-bankingAccountTypes';
    cy.get(`${grid} [class*="feedbackError"]`).should('be.visible').and('contain.text', errorText);
  },

  saveAccountTypeChanges() {
    cy.get('button[id^="clickable-save-bankingAccountTypes-"]').click();
  },

  checkRowActionButtons(typeName) {
    cy.do(
      MultiColumnListCell({ content: typeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.expect(getEditableListRow(rowNumber).find(editIconButton).exists());
        cy.expect(getEditableListRow(rowNumber).find(trashIconButton).exists());
        cy.expect(getEditableListRow(rowNumber).find(editIconButton).is({ disabled: false }));
        cy.expect(getEditableListRow(rowNumber).find(trashIconButton).is({ disabled: false }));
      }),
    );
  },

  cancelAccountTypeChanges() {
    cy.get('button[id^="clickable-cancel-bankingAccountTypes-"]').click();
  },

  clickDeleteAccountType(typeName) {
    cy.do(
      MultiColumnListCell({ content: typeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(trashIconButton).click());
      }),
    );
  },

  checkDeleteAccountTypeModal(typeName) {
    cy.get('#delete-controlled-vocab-entry-confirmation')
      .should('be.visible')
      .within(() => {
        cy.contains(`The account type ${typeName} will be deleted.`).should('be.visible');
        cy.get('#clickable-delete-controlled-vocab-entry-confirmation-confirm')
          .should('be.visible')
          .and('be.enabled');
        cy.get('#clickable-delete-controlled-vocab-entry-confirmation-cancel')
          .should('be.visible')
          .and('be.enabled');
      });
  },

  cancelDeleteAccountType() {
    cy.get('#clickable-delete-controlled-vocab-entry-confirmation-cancel').click();
    cy.get('#delete-controlled-vocab-entry-confirmation').should('not.exist');
  },

  deleteAccountType(typeName) {
    cy.do(
      MultiColumnListCell({ content: typeName.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([
          getEditableListRow(rowNumber).find(trashIconButton).click(),
          Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }).click(),
        ]);
      }),
    );
    cy.wait(1000);
    InteractorsTools.checkCalloutMessage(
      `The account type ${typeName.name} was successfully deleted`,
    );
  },

  tryToDeleteAccountTypeWhenItUnable(typeName) {
    cy.do(
      MultiColumnListCell({ content: typeName.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([
          getEditableListRow(rowNumber).find(trashIconButton).click(),
          Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }).click(),
        ]);
      }),
    );
    cy.wait(1000);
    InteractorsTools.checkModalMessage(
      'Cannot delete account type',
      'Unable to delete. Account type is in use by one or more organizations.',
    );
    cy.wait(1000);
    cy.do([Button('Okay').click()]);
  },

  checkAccountTypeAbsent(typeName) {
    cy.get('#editList-bankingAccountTypes')
      .should('exist')
      .find(`[data-row-inner*="${typeName}"]`)
      .should('not.exist');
  },

  clickNewButton() {
    cy.do(Button({ id: 'clickable-add-bankingAccountTypes' }).click());
    cy.wait(2000);
  },

  checkNewAccountTypeRow() {
    cy.get('#editList-bankingAccountTypes')
      .find('input[type="text"]')
      .should('have.attr', 'placeholder', 'name');
    cy.get('button[id^="clickable-cancel-bankingAccountTypes"]').should('be.enabled');
    cy.get('button[id^="clickable-save-bankingAccountTypes"]').should('be.disabled');
  },

  checkDuplicateNameValidation() {
    cy.get('div[class^="feedbackError-"]')
      .should('be.visible')
      .and('contain.text', 'Account type must be unique.');
    cy.get('button[id^="clickable-save-bankingAccountTypes"]').should('be.disabled');
  },

  enableBankingInformationViaApi(response) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `organizations-storage/settings/${response.settings[0].id}`,
      body: response.settings[0],
      isDefaultSearchParamsRequired: false,
    });
  },

  getBankingInformationStatusViaApi: () => {
    return cy
      .okapiRequest({
        path: 'organizations-storage/settings',
        searchParams: {
          query: 'key=BANKING_INFORMATION_ENABLED',
          limit: '1',
        },
      })
      .then(({ body }) => body);
  },
};
