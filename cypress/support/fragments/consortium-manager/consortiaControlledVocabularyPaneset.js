import {
  Button,
  Checkbox,
  EditableListRow,
  IconButton,
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

const newButton = Button('New');
const memberLibrariesShare = Checkbox({ labelText: 'Share' });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const confirmDeleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const confirmDeleteButton = Button({
  id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm',
});
const cancelDeleteButton = Button({
  id: 'clickable-delete-controlled-vocab-entry-confirmation-cancel',
});

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

  verifyNewRowInEditMode({ name, isShared = false, withCode = false } = {}) {
    const newRow = EditableListRow({ index: 0 });

    this.verifyEditModeIsActive();
    cy.expect([
      TextField({ placeholder: 'name' }).has({ disabled: false }),
      newRow.find(MultiColumnListCell({ column: 'Source' })).has({ content: 'local' }),
      newRow.find(MultiColumnListCell({ column: 'Last updated' })).has({ content: including('-') }),
    ]);
    if (withCode) cy.expect(TextField({ placeholder: 'code' }).has({ disabled: false }));
    if (name) cy.expect(TextField({ placeholder: 'name' }).has({ value: name }));
    this.verifyShareCheckboxState({ isEnabled: true, isChecked: isShared });
  },

  verifyEditRowInList({ name, code, source, lastUpdated = [] }) {
    // only the row in edit mode has the name input; this also handles local records
    // that share one name across tenants
    const row = MultiColumnListRow({
      innerHTML: and(including(name), including('placeholder="name"')),
      isContainer: false,
    });
    const sourceCell = row.find(MultiColumnListCell({ column: 'Source' }));
    const lastUpdatedCell = row.find(MultiColumnListCell({ column: 'Last updated' }));

    cy.expect([
      row.find(TextField({ placeholder: 'name' })).has({ value: name }),
      lastUpdatedCell.find(TextField()).absent(),
    ]);
    // some settings (e.g. loan types) have no "Source" column
    if (source)
      cy.expect([sourceCell.has({ content: source }), sourceCell.find(TextField()).absent()]);
    if (code) cy.expect(row.find(TextField({ placeholder: 'code' })).has({ value: code }));
    lastUpdated.forEach((text) => {
      cy.expect(lastUpdatedCell.has({ content: including(text) }));
    });
  },

  fillInTextField(textInput) {
    const [placeholder, value] = Object.entries(textInput)[0];
    cy.do(TextField({ placeholder }).fillIn(value));
  },

  verifyFilledInTextField(textInput) {
    const [placeholder, value] = Object.entries(textInput)[0];
    const textField = TextField({ placeholder });
    cy.expect([
      textField.has({ value }),
      textField.find(IconButton({ icon: 'times-circle-solid' })).exists(),
    ]);
  },

  checkShareCheckbox() {
    cy.do(memberLibrariesShare.checkIfNotSelected());
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
    cy.then(() =>
      MultiColumnListRow({
        content: including(record[0]),
        isContainer: true,
      }).rowIndexInParent(),
    ).then((rowIndexInParent) => {
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

  verifyLastUpdatedInTheList(recordName, texts) {
    const row = MultiColumnListRow({ content: including(recordName), isContainer: true });
    texts.forEach((text) => {
      cy.expect(
        row
          .find(MultiColumnListCell({ column: 'Last updated', innerText: including(text) }))
          .exists(),
      );
    });
  },

  // if some entity is created for all tenants, it should be searched by name and member name
  // use for searching identifiers array
  verifyRecordInTheListForMultipleRecords(identifiers, record, actionButtons = []) {
    cy.then(() =>
      MultiColumnListRow({
        content: and(including(identifiers[0]), including(identifiers[1])),
        isContainer: true,
      }).rowIndexInParent(),
    ).then((rowIndexInParent) => {
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

  verifyRecordHasNoDuplicatesInTheList(name) {
    cy.get('[class^=editListRow-]')
      .filter((_, el) => el.textContent.includes(name))
      .should('have.length', 1);
  },

  verifyShareCheckboxState({ isEnabled = true, isChecked = false } = {}) {
    cy.expect([memberLibrariesShare.is({ disabled: !isEnabled, checked: isChecked })]);
  },

  clearTextField(placeholder) {
    const field = TextField({ placeholder });

    cy.do([field.focus(), field.fillIn('')]);
    cy.expect(TextField({ placeholder }).has({ value: '' }));
  },

  verifySaveButtonIsActive(isActive = true) {
    cy.expect(saveButton.is({ disabled: !isActive }));
  },

  verifyDeleteConfirmationMessage(settingName, entityName) {
    cy.expect(
      confirmDeleteModal.has({
        header: `Delete ${settingName}`,
        message: `The ${settingName} ${entityName} will be deleted.`,
      }),
    );
    cy.expect(cancelDeleteButton.is({ disabled: false }));
    cy.expect(confirmDeleteButton.is({ disabled: false }));
  },
};
