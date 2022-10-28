import { Button, QuickMarcEditorRow, Modal } from '../../../../interactors';

export default {
  deleteField:() => {
    cy.do(QuickMarcEditorRow({ index: '29' }).find(Button({ icon: 'trash' })).click());
    cy.do(Button('Save & close').click());
    cy.do(Modal('Delete fields').find(Button('Continue with save')));
  }
};
