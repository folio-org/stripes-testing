import uuid from 'uuid';
import { including } from 'bigtest';
import { Button, MultiColumnListCell, MultiColumnListRow, PaneHeader, Section, TextField, Modal, MultiColumnListHeader } from '../../../../../interactors';
import { getTestEntityValue } from '../../../utils/stringTools';


const rootSection = Section({ id:'controlled-vocab-pane' });
const newButton = rootSection.find(Button({ id:'clickable-add-settings-waives' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-settings-waives-') }));
const reasonTextField = rootSection.find(TextField({ placeholder: 'nameReason' }));
const descriptionTextField = TextField({ placeholder: 'description' });

const getRowByReason = (reason) => cy.then(() => rootSection.find(MultiColumnListCell(reason)).row());
const getDescriptionColumnIdex = () => cy.then(() => rootSection.find(MultiColumnListHeader('Description')).index());

export const getNewWaiveReason = (name, desc) => ({
  nameReason: name ? getTestEntityValue(name) : getTestEntityValue(),
  description: desc ? getTestEntityValue(desc) : getTestEntityValue(),
  id: uuid(),
});

export default {
  waitLoading:() => cy.expect(rootSection.find(PaneHeader('Fee/fine: Waive reasons')).exists()),
  startAdding:() => cy.do(newButton.click()),
  fillReasonParameters : ({ reason, description }) => {
    cy.do(reasonTextField.fillIn(reason));
    cy.do(rootSection.find(descriptionTextField).fillIn(description));
  },
  trySave:() => cy.do(saveButton.click()),
  checkSaveButtonState: ({ isDisabled }) => {
    cy.expect(saveButton.has({ disabled: isDisabled }));
  },
  checkReasonValidatorMessage:() => {
    cy.expect(reasonTextField.has({ error: 'Please fill this in to continue' }));
  },
  checkReason:({ reason, description }) => {
    getRowByReason(reason).then(row => {
      getDescriptionColumnIdex().then(descriptionColumnIdex => {
        cy.expect(rootSection.find(MultiColumnListRow({ ariaRowIndex: row })).find(MultiColumnListCell({ columnIndex: descriptionColumnIdex })).has({ text: description }));
      });
    });
  },
  startEdit:(reason) => {
    getRowByReason(reason).then(row => {
      cy.do(rootSection.find(MultiColumnListRow({ ariaRowIndex: row })).find(Button({ icon: 'edit' })).click());
    });
  },
  delete:(reason) => {
    getRowByReason(reason).then(row => {
      cy.do(rootSection.find(MultiColumnListRow({ ariaRowIndex: row })).find(Button({ icon: 'trash' })).click());
      cy.do(Modal({ id: 'delete-controlled-vocab-entry-confirmation' }).find(Button({ id:'clickable-delete-controlled-vocab-entry-confirmation-confirm' })).click());
      cy.expect(rootSection.find(MultiColumnListCell(reason)).absent());
    });
  },
  createViaApi: (waiveReason) => cy.okapiRequest({ method: 'POST',
    path: 'waives',
    body: waiveReason,
    isDefaultSearchParamsRequired: false }),
  deleteViaApi:  (waiveReasonId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `waives/${waiveReasonId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

};
