import {
  Button,
  TextField,
  MultiColumnListHeader,
  NavListItem,
  EditableListRow,
  MultiColumnListCell,
  Modal,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import DateTools from '../../../utils/dateTools';
import { REQUEST_METHOD } from '../../../constants';

const saveButton = Button('Save');
const deleteButton = Button('Delete');
const trashIconButton = Button({ icon: 'trash' });
const editIconButton = Button({ icon: 'edit' });
const fundTypesListItem = NavListItem('Fund types');
const ExpenseClassesListItem = NavListItem('Expense classes');
const ExportCodeListItem = NavListItem('Export fund and expense class codes');
const ExchangeRateSourceListItem = NavListItem('Exchange rate sources');
const actions = Button('Actions');
const newButton = Button('+ New');
function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  waitExpenseClassesLoading: () => {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).exists());
  },
  waitFundTypesLoading: () => {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).exists());
  },

  verifyItemInFinancePanel() {
    cy.expect([
      fundTypesListItem.exists(),
      ExpenseClassesListItem.exists(),
      ExportCodeListItem.absent(),
      ExchangeRateSourceListItem.absent(),
    ]);
  },

  verifyItemInDetailPanel() {
    cy.expect([actions.absent(), newButton.absent()]);
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  clicksaveButton() {
    cy.do(saveButton.click());
  },

  fillTypeName(name) {
    if (!name) {
      return cy.get('[name="items[0].name"]').clear().blur();
    }
    return cy.get('[name="items[0].name"]').clear().type(name).blur();
  },

  checkErrorMessage() {
    cy.get('#editList-fundTypes [class*="feedbackError"]')
      .should('be.visible')
      .and('contain.text', 'Please fill this in to continue');
  },

  fillRequiredFields: (expenseClasses) => {
    cy.do([
      TextField({ placeholder: 'name' }).fillIn(expenseClasses.name),
      TextField({ placeholder: 'code' }).fillIn(expenseClasses.code),
      TextField({ placeholder: 'externalAccountNumberExt' }).fillIn(
        expenseClasses.externalAccountNumber,
      ),
      saveButton.click(),
    ]);
  },

  clickExpenseClass() {
    cy.do(ExpenseClassesListItem.click());
  },

  createNewExpenseClass(expenseClass) {
    cy.do(Button({ id: 'clickable-add-expenseClasses' }).click());
    cy.wait(2000);
    this.fillRequiredFields(expenseClass);
    cy.wait(4000);
  },

  editExpenseClass(expenseClass, oldExpenseClassName) {
    cy.do(
      MultiColumnListCell({ content: oldExpenseClassName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(editIconButton).click());
        this.fillRequiredFields(expenseClass);
      }),
    );
    cy.wait(4000);
  },

  checkExpenseClass: (expenseClass, userName) => {
    cy.do(
      MultiColumnListCell({ content: expenseClass.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const createdByAdmin = `${DateTools.getCurrentDateINDDMMYYYYFormat()} by ${userName}`;
        cy.expect(
          getEditableListRow(rowNumber)
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: expenseClass.name }),
        );
        cy.expect(
          getEditableListRow(rowNumber)
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: expenseClass.code }),
        );
        cy.expect(
          getEditableListRow(rowNumber)
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: createdByAdmin }),
        );
      }),
    );
  },

  checkEditDeleteIcon: (typeClass) => {
    cy.do(
      MultiColumnListCell({ content: typeClass.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.expect(getEditableListRow(rowNumber).find(editIconButton).absent());
        cy.expect(getEditableListRow(rowNumber).find(deleteButton).absent());
      }),
    );
  },

  checkFundType: (fundType) => {
    cy.do(
      MultiColumnListCell({ content: fundType.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.expect(
          getEditableListRow(rowNumber)
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: fundType.name }),
        );
      }),
    );
  },
  deleteExpenseClass: (expenseClass) => {
    cy.do(
      MultiColumnListCell({ content: expenseClass.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([getEditableListRow(rowNumber).find(trashIconButton).click(), deleteButton.click()]);
      }),
    );
    InteractorsTools.checkCalloutMessage(
      `The expense class ${expenseClass.name} was successfully deleted`,
    );
  },

  deleteFundType: (fundType) => {
    cy.do(
      MultiColumnListCell({ content: fundType.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([getEditableListRow(rowNumber).find(trashIconButton).click(), deleteButton.click()]);
      }),
    );
    InteractorsTools.checkCalloutMessage(`The fund type ${fundType.name} was successfully deleted`);
  },

  canNotDeleteFundType: (fundType) => {
    cy.do(
      MultiColumnListCell({ content: fundType.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do([getEditableListRow(rowNumber).find(trashIconButton).click(), deleteButton.click()]);
      }),
    );
    cy.expect(
      Modal('Cannot delete fund type').has({
        content:
          'Cannot delete fund typeThis fund type cannot be deleted, as it is in use by one or more records.Okay',
      }),
    );
    cy.do(Modal('Cannot delete fund type').find(Button('Okay')).click());
  },

  deleteViaApi: (id) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `finance/expense-classes/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
