import { getTestEntityValue } from '../../../utils/stringTools';
import { Button, Section, TextField, MultiColumnListCell, Modal } from '../../../../../interactors';

const startRowIndex = 2;
const refundReasonSection = Section({ id: 'controlled-vocab-pane' });
const addNewButton = refundReasonSection.find(Button({ id: 'clickable-add-settings-refunds' }));
const saveButton = (index = 0) => refundReasonSection.find(Button({ id: `clickable-save-settings-refunds-${index}` }));
const cancelButton = (index = 0) => refundReasonSection.find(Button({ id: `clickable-cancel-settings-refunds-${index}` }));
const editButton = (index = 0) => refundReasonSection.find(Button({ id: `clickable-edit-settings-refunds-${index}` }));
const deleteButton = (index = 0) => refundReasonSection.find(Button({ id: `clickable-delete-settings-refunds-${index}` }));
const reasonTextField = refundReasonSection.find(
  TextField({ error: 'Refund reason already exists' }),
);
const deleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const deleteButtonInModal = deleteModal.find(
  Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }),
);

export default {
  getDefaultNewRefundReason: (id, name, desc) => ({
    nameReason: getTestEntityValue(name),
    description: getTestEntityValue(desc),
    id,
  }),
  createViaApi: (refundReason) => cy.okapiRequest({
    method: 'POST',
    path: 'refunds',
    body: refundReason,
    isDefaultSearchParamsRequired: false,
  }),
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `refunds/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
  clickAddNewButton() {
    cy.do(addNewButton.click());
  },
  clickSaveButton(index) {
    cy.do(saveButton(index).click());
    cy.wait(1500);
  },
  clickCancelButton(index) {
    cy.do(cancelButton(index).click());
  },
  clickEditButton(index) {
    cy.do(editButton(index).click());
  },
  clickDeleteButton(index) {
    cy.do(deleteButton(index).click());
  },
  verifySaveButtonDisabled: (index) => cy.do(saveButton(index).has({ disabled: true })),
  checkReasonValidatorMessage: () => {
    cy.expect(reasonTextField.exists());
  },
  fillInFields(data, index = 0) {
    cy.do([
      TextField({ name: `items[${index}].nameReason` }).fillIn(data.name),
      TextField({ name: `items[${index}].description` }).fillIn(data.description),
    ]);
  },
  createViaUi(refundReason, index = 0) {
    this.clickAddNewButton();
    this.verifySaveButtonDisabled(index);
    this.fillInFields(refundReason);
    this.clickSaveButton(index);
  },
  editViaUi(refundReason, newRefundReason) {
    cy.then(() => refundReasonSection.find(MultiColumnListCell(refundReason.name)).row()).then(
      (rowIndex) => {
        // calculation is needed because aria-rowindex started from 2.
        const index = rowIndex - startRowIndex;
        this.clickEditButton(index);
        this.fillInFields(newRefundReason, index);
        this.clickSaveButton(index);
      },
    );
  },
  deleteViaUi(refundReason) {
    cy.then(() => refundReasonSection.find(MultiColumnListCell(refundReason.name)).row()).then(
      (rowIndex) => {
        // calculation is needed because aria-rowindex started from 2.
        const index = rowIndex - startRowIndex;
        this.clickDeleteButton(index);
        cy.do(deleteButtonInModal.click());
        cy.expect(refundReasonSection.find(MultiColumnListCell(refundReason.name)).absent());
      },
    );
  },
  verifyRefundReasonRecord(refundReason) {
    MultiColumnListCell({ content: refundReason.name }).exists();
    MultiColumnListCell({ content: refundReason.description }).exists();
    if (refundReason.date) {
      MultiColumnListCell({ content: refundReason.date }).exists();
    }
  },
};
