import {
  Button,
  TextField,
  MultiColumnListHeader,
  EditableListRow,
  MultiColumnListCell,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import DateTools from '../../../utils/dateTools';
import { REQUEST_METHOD } from '../../../constants';

const saveButton = Button('Save');
const deleteButton = Button('Delete');
const trashIconButton = Button({ icon: 'trash' });
const editIconButton = Button({ icon: 'edit' });
function getEditableListRow(rowNumber) {
  return EditableListRow({ index: +rowNumber.split('-')[1] });
}

export default {
  waitExpenseClassesLoading: () => {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).exists());
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

  createNewExpenseClass(expenseClass) {
    cy.do(Button({ id: 'clickable-add-expenseClasses' }).click());
    this.fillRequiredFields(expenseClass);
  },

  editExpenseClass(expenseClass, oldExpenseClassName) {
    cy.do(
      MultiColumnListCell({ content: oldExpenseClassName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        cy.do(getEditableListRow(rowNumber).find(editIconButton).click());
        this.fillRequiredFields(expenseClass);
      }),
    );
  },

  checkExpenseClass: (expenseClass) => {
    cy.do(
      MultiColumnListCell({ content: expenseClass.name }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const createdByAdmin = `${DateTools.getFormattedDateWithSlashes({
          date: new Date(),
        })} by ADMINISTRATOR, Diku_admin`;
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

  deleteViaApi: (id) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `finance/expense-classes/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
