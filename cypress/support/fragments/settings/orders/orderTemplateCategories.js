import uuid from 'uuid';
import {
  Button,
  EditableListRow,
  MultiColumnListCell,
  Pane,
  TextField,
  Modal,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';
import InteractorsTools from '../../../utils/interactorsTools';

const REQUIRED_MESSAGE = 'Please fill this in to continue';
const UNIQUE_MESSAGE = 'Category name must be unique';

const categoriesPane = Pane({ id: 'controlled-vocab-pane' });
const newButton = Button('+ New');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const unsavedModal = Modal('Are you sure?');
const deleteModal = Modal('Delete order template category');
const cannotDeleteModal = Modal('Cannot delete the order template category');

function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

const OrderTemplateCategories = {
  getDefaultOrderTemplateCategory: () => ({
    id: uuid(),
    name: `OTC_name_${getRandomPostfix()}`,
  }),

  createOrderTemplateCategoryViaApi: (orderTemplateCategory) => {
    cy.okapiRequest({
      method: 'POST',
      path: 'orders-storage/order-template-categories',
      body: orderTemplateCategory,
      isDefaultSearchParamsRequired: false,
    }).then((response) => response.body);
  },

  deleteOrderTemplateCategoryViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `orders-storage/order-template-categories/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  waitLoading: () => {
    cy.expect(categoriesPane.exists());
  },

  startNewCategory: () => {
    cy.do(newButton.click());
    OrderTemplateCategories.verifyEditMode(false);
  },

  fillCategoryName: (name) => {
    cy.do(TextField({ name: 'items[0].name' }).fillIn(name));
    cy.expect(saveButton.has({ disabled: false }));
  },

  triggerEmptyValidation: () => {
    cy.do(categoriesPane.click());
    OrderTemplateCategories.verifyNameFieldValidation(REQUIRED_MESSAGE);
  },

  clearNameField: () => {
    cy.do(TextField().clear());
    OrderTemplateCategories.verifyNameFieldValidation(REQUIRED_MESSAGE);
  },

  saveCategory: (name) => {
    cy.do(saveButton.click());
    InteractorsTools.checkCalloutMessage(`The category ${name} was successfully created`);
    cy.expect(MultiColumnListCell(name).exists());
  },

  editCategory: (oldName, newName) => {
    cy.do(
      MultiColumnListCell({ content: oldName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'edit' }))
            .click(),
        );
      }),
    );
    cy.do(TextField().fillIn(newName));
    cy.do(saveButton.click());
    InteractorsTools.checkCalloutMessage(`The category ${newName} was successfully updated`);
    cy.expect(MultiColumnListCell(newName).exists());
  },

  cancelEdit: (name, interimValue) => {
    cy.do(
      MultiColumnListCell({ content: name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'edit' }))
            .click(),
        );
      }),
    );
    cy.do(TextField().fillIn(interimValue));
    cy.do(cancelButton.click());
    cy.expect(MultiColumnListCell(name).exists());
  },

  attemptDuplicateCategory: (existingName) => {
    cy.do(newButton.click());
    OrderTemplateCategories.verifyEditMode(false);
    cy.do(TextField({ name: 'items[0].name' }).fillIn(existingName));
    OrderTemplateCategories.verifyNameFieldValidation(UNIQUE_MESSAGE);
  },

  verifyNameFieldValidation: (errorMessage) => {
    cy.expect(TextField({ name: 'items[0].name' }).has({ error: errorMessage }));
    cy.expect(saveButton.has({ disabled: true }));
  },

  verifyEditMode: (isSaveActive = true) => {
    cy.expect([
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: !isSaveActive }),
      newButton.has({ disabled: true }),
    ]);
  },

  selectActionInUnsavedModal: (action) => {
    cy.expect(
      unsavedModal.has({
        header: 'Are you sure?',
        message: 'There are unsaved changes',
      }),
    );
    cy.do(unsavedModal.find(Button(action)).click());
    cy.expect(unsavedModal.absent());

    if (action === 'Keep editing') {
      cy.expect(categoriesPane.exists());
      const nameField = TextField({ name: 'items[0].name' });
      cy.expect(nameField.has({ error: UNIQUE_MESSAGE }));
    } else if (action === 'Close without saving') {
      cy.expect(Pane('Approvals').exists());
    }
  },

  deleteCategory(name, action = 'Delete') {
    cy.do(
      MultiColumnListCell({ content: name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      }),
    );
    cy.expect(
      deleteModal.has({
        header: 'Delete order template category',
        message: `The order template category ${name} will be deleted.`,
      }),
    );
    cy.do(deleteModal.find(Button(action)).click());

    if (action === 'Delete') {
      InteractorsTools.checkCalloutMessage(`The category ${name} was successfully deleted`);
      cy.expect(MultiColumnListCell(name).absent());
    } else if (action === 'Cancel') {
      cy.expect(deleteModal.absent());
      cy.expect(MultiColumnListCell(name).exists());
    }
  },

  attemptDeleteInUseCategory: (name) => {
    cy.do(
      MultiColumnListCell({ content: name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(
          getEditableListRow(rowNumber)
            .find(Button({ icon: 'trash' }))
            .click(),
        );
      }),
    );
    cy.do(deleteModal.find(Button('Delete')).click());
    cy.expect(
      cannotDeleteModal.has({
        message:
          'This order template category cannot be deleted, as it is in use by one or more records.',
      }),
    );
    cy.do(cannotDeleteModal.find(Button('Okay')).click());
    cy.expect(MultiColumnListCell(name).exists());
  },
};

export default OrderTemplateCategories;
