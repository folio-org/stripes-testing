/* eslint-disable cypress/no-unnecessary-waiting */
import { including } from '@interactors/html';
import {
  Button,
  QuickMarcEditorRow,
  Modal,
  Pane,
  TextField,
  TextArea,
} from '../../../../interactors';

const deleteFieldsModal = Modal('Delete fields');

const saveAndClose = () => {
  // need to wait until data will be filled in
  cy.wait(1500);
  cy.do(Button('Save & close').click());
};

export default {
  saveAndClose,
  deleteField: (rowIndex) => {
    // need to wait until the row will be uploaded
    cy.wait(1500);
    cy.do([
      QuickMarcEditorRow({ index: rowIndex })
        .find(TextField({ name: including('.tag') }))
        .fillIn(''),
      QuickMarcEditorRow({ index: rowIndex })
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
    ]);
  },

  confirmDeletingField: () => {
    cy.do(
      deleteFieldsModal.find(Button({ id: 'clickable-quick-marc-confirm-modal-confirm' })).click(),
    );
    cy.expect(deleteFieldsModal.absent());
  },

  checkEditableQuickMarcFormIsOpened: () => {
    cy.expect(Pane({ id: 'quick-marc-editor-pane' }).exists());
  },

  addField: (fieldNumber, content, rowIndex = 39) => {
    // need to wait until all data loaded
    cy.wait(1000);
    cy.do([
      QuickMarcEditorRow({ index: rowIndex })
        .find(Button({ icon: 'plus-sign' }))
        .click(),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextField({ name: `records[${rowIndex + 1}].tag` }))
        .fillIn(fieldNumber),
      QuickMarcEditorRow({ index: rowIndex + 1 })
        .find(TextArea({ name: `records[${rowIndex + 1}].content` }))
        .fillIn(content),
    ]);
  },

  editField: (content, newContent) => {
    // need to wait until the field will be found
    cy.wait(1000);
    cy.do(TextArea({ textContent: including(content) }).fillIn(newContent));
  },
};
