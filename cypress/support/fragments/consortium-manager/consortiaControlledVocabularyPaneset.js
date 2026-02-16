import {
  Button,
  Checkbox,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  TextField,
  and,
  including,
} from '../../../../interactors';

export const actionIcons = {
  edit: 'edit',
  trash: 'trash',
};

const newButton = Button('+ New');
const memberLibrariesShare = Checkbox({ labelText: 'Share' });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const confirmDeleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const confirmDeleteButton = Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' });
const cancelDeleteButton = Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-cancel' });

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

  verifyNewButtonShown(isShown = true) {
    if (isShown) cy.expect(newButton.exists());
    else cy.expect(newButton.absent());
  },

  verifyEditModeIsActive(isSaveActive = true) {
    this.verifyNewButtonDisabled();
    cy.expect([
      MultiColumnList().find(TextField()).exists(),
      cancelButton.is({ disabled: false }),
      saveButton.is({ disabled: !isSaveActive }),
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
    cy.wait(500);
    cy.do(saveButton.click());
    cy.wait(1000);
  },

  confirmDelete() {
    cy.do(confirmDeleteButton.click());
  },

  verifyFieldValidatorError(errorMessage) {
    const [placeholder, error] = Object.entries(errorMessage)[0];
    cy.expect(TextField({ placeholder }).has({ errorIcon: true, errorBorder: true, error }));
  },

  performAction(recordName, action) {
    // actions are selected by button name: trash(delete) or edit
    cy.do(
      MultiColumnListRow({ content: including(recordName), isContainer: true })
        .find(Button({ icon: action }))
        .click(),
    );
  },

  verifyRecordInTheList(record, actionButtons = []) {
    cy.then(() => MultiColumnListRow({
      content: including(record[0]),
      isContainer: true,
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

  // if some entity is created for all tenants, it should be searched by name and member name
  // use for searching identifiers array
  verifyRecordInTheListForMultipleRecords(identifiers, record, actionButtons = []) {
    cy.then(() => MultiColumnListRow({
      content: and(including(identifiers[0]), including(identifiers[1])),
      isContainer: true,
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

  performActionFor(name, tenant, action) {
    // actions are selected by button name: trash(delete) or edit
    cy.xpath(
      `.//*[(contains(@class, 'mclRowFormatterContainer')) and (./*[(./*[text()='${name}']) and (./*[text()='${tenant}'])])]`,
    )
      .invoke('attr', 'data-row-index')
      .then((rowIndexInParent) => {
        cy.do(
          MultiColumnListRow({ rowIndexInParent })
            .find(Button({ icon: action }))
            .click(),
        );
      });
  },

  // MultiColumnListRow({ content: and(including(identifiers[0]), including(identifiers[1])), isContainer: true })
  verifyRecordIsInTheList(name, tenant, record, actionButtons = []) {
    cy.xpath(
      `.//*[(contains(@class, 'mclRowFormatterContainer')) and (./*[(./*[text()='${name}']) and (./*[text()='${tenant}'])])]`,
    )
      .invoke('attr', 'data-row-index')
      .then((rowIndexInParent) => {
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

  verifyRecordIsNotInTheList(name, tenant) {
    cy.xpath(
      `.//*[(contains(@class, 'mclRowFormatterContainer')) and (./*[(./*[text()='${name}']) and (./*[text()='${tenant}'])])]`,
    ).should('not.exist');
  },

  verifyRecordNotInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },

  verifyShareCheckboxState({ isEnabled = true, isChecked = false } = {}) {
    cy.expect([memberLibrariesShare.is({ disabled: !isEnabled, checked: isChecked })]);
  },

  clearTextField(placeholder) {
    cy.do(TextField({ placeholder }).clear());
    cy.expect(TextField({ placeholder }).has({ value: '' }));
  },

  verifySaveButtonIsActive(isActive = true) {
    cy.expect(saveButton.is({ disabled: !isActive }));
  },

  verifyDeleteConfirmationMessage(settingName, entityName) {
    cy.expect(confirmDeleteModal.has({
      header: `Delete ${settingName}`,
      message: `The ${settingName} ${entityName} will be deleted.`,
    }));
    cy.expect(cancelDeleteButton.is({ disabled: false }));
    cy.expect(confirmDeleteButton.is({ disabled: false }));
  },
};
