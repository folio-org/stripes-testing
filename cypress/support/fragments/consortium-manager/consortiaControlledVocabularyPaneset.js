import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  including,
  TextField,
  Checkbox,
  PaneHeader,
  and,
} from '../../../../interactors';

export const actionIcons = {
  edit: 'edit',
  trash: 'trash',
};

const newButton = Button('+ New');
const memberLibrariesShare = Checkbox({ labelText: 'Share' });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');

export default {
  waitLoading(panesetName) {
    cy.expect(PaneHeader(panesetName).exists());
  },

  clickNew() {
    cy.do(newButton.click());
  },

  verifyNewButtonDisabled(status = true) {
    cy.expect(newButton.is({ disabled: status }));
  },

  verifyEditModeIsActive() {
    this.verifyNewButtonDisabled();
    cy.expect([
      MultiColumnListRow({ rowIndexInParent: 'row-0' }).find(TextField()).exists(),
      memberLibrariesShare.is({ disabled: false }),
      cancelButton.is({ disabled: false }),
      saveButton.is({ disabled: false }),
    ]);
  },

  fillInTextField(textInput) {
    const [placeholder, value] = Object.entries(textInput)[0];
    cy.do(TextField({ placeholder }).fillIn(value));
  },

  createViaUi(isShared, textFieldData) {
    this.clickNew();
    this.verifyEditModeIsActive();
    cy.wrap(Object.entries(textFieldData)).each(([textFieldName, value]) => {
      this.fillInTextField({ [textFieldName]: value });
    });
    cy.do(isShared && memberLibrariesShare.click());
  },

  clickCancel() {
    cy.do(cancelButton.click());
  },

  clickSave() {
    cy.do(saveButton.click());
  },

  verifyFieldValidatorError(errorMessage) {
    const [placeholder, error] = Object.entries(errorMessage)[0];
    cy.expect(TextField({ placeholder }).has({ errorIcon: true, errorBorder: true, error }));
  },

  performAction(recordName, action) {
    // actions are selected by button name: trash(delete) or edit
    cy.do(
      MultiColumnListRow({ content: including(recordName) })
        .find(Button({ icon: action }))
        .click(),
    );
  },

  verifyRecordInTheList(record, actionButtons = []) {
    cy.then(() => MultiColumnListRow({
      content: and(including(record[0]), including(record[record.length - 1])),
    }).rowIndexInParent()).then((rowIndexInParent) => {
      cy.wrap(record).each((text, columnIndex) => {
        cy.expect(
          MultiColumnListRow({ rowIndexInParent })
            .find(MultiColumnListCell({ innerText: including(text), columnIndex }))
            .exists(),
        );
      });

      const actionsCell = MultiColumnListRow({ rowIndexInParent }).find(
        MultiColumnListCell({ columnIndex: record.length }),
      );
      if (actionButtons.length === 0) {
        cy.expect(actionsCell.has({ content: '' }));
      } else {
        cy.wrap(Object.values(actionIcons)).each((action) => {
          if (actionButtons.includes(action)) {
            cy.expect(actionsCell.find(Button({ icon: action })).exists());
          } else {
            cy.expect(actionsCell.find(Button({ icon: action })).absent());
          }
        });
      }
    });
  },

  verifyRecordNotInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },
};