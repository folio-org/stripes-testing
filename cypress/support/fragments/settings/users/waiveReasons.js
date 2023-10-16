import { including } from 'bigtest';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  TextField,
  Modal,
} from '../../../../../interactors';
import { getTestEntityValue } from '../../../utils/stringTools';

const rootSection = Section({ id: 'controlled-vocab-pane' });
const newButton = rootSection.find(Button({ id: 'clickable-add-settings-waives' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-settings-waives-') }));
const reasonTextField = rootSection.find(TextField({ placeholder: 'nameReason' }));
const descriptionTextField = TextField({ placeholder: 'description' });

const getRowByReason = (reason) => cy.then(() => rootSection.find(MultiColumnListCell(reason)).row());

export default {
  waitLoading: () => cy.expect(rootSection.find(PaneHeader('Fee/fine: Waive reasons')).exists()),
  getDefaultNewWaiveReason: (id, name, desc) => ({
    nameReason: getTestEntityValue(name),
    description: getTestEntityValue(desc),
    id,
  }),
  startAdding: () => cy.do(newButton.click()),
  fillReasonParameters: ({ name, description }) => {
    cy.do(reasonTextField.fillIn(name));
    cy.do(rootSection.find(descriptionTextField).fillIn(description));
  },
  trySave: () => cy.do(saveButton.click()),
  checkSaveButtonState: ({ isDisabled }) => {
    cy.expect(saveButton.has({ disabled: isDisabled }));
  },
  checkReasonValidatorMessage: () => {
    cy.expect(reasonTextField.has({ error: 'Please fill this in to continue' }));
  },
  startEdit: (reason) => {
    getRowByReason(reason).then((row) => {
      cy.do(
        rootSection
          .find(MultiColumnListRow({ ariaRowIndex: row }))
          .find(Button({ icon: 'edit' }))
          .click(),
      );
    });
  },
  delete: (reason) => {
    getRowByReason(reason).then((row) => {
      cy.do(
        rootSection
          .find(MultiColumnListRow({ ariaRowIndex: row }))
          .find(Button({ icon: 'trash' }))
          .click(),
      );
      cy.do(
        Modal({ id: 'delete-controlled-vocab-entry-confirmation' })
          .find(Button({ id: 'clickable-delete-controlled-vocab-entry-confirmation-confirm' }))
          .click(),
      );
      cy.expect(rootSection.find(MultiColumnListCell(reason)).absent());
    });
  },
  createViaApi: (waiveReason) => cy
    .okapiRequest({
      method: 'POST',
      path: 'waives',
      body: waiveReason,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => ({
      id: response.body.id,
      nameReason: response.body.nameReason,
    })),
  deleteViaApi: (waiveReasonId) => cy.okapiRequest({
    method: 'DELETE',
    path: `waives/${waiveReasonId}`,
    isDefaultSearchParamsRequired: false,
  }),
};
