import { Pane, Button, Modal } from '../../../../../../interactors';

const actionsButton = Button('Actions');
const deleteButton = Button('Delete');
const paneDetailsView = Pane({ id: 'view-file-extension-pane' });

export default {
  delete: (extension) => {
    cy.do([
      paneDetailsView.find(actionsButton).click(),
      deleteButton.click(),
      Modal(`Delete "${extension}" file extension?`).find(deleteButton).click(),
    ]);
    cy.expect(Modal(`Delete "${extension}" file extension?`).absent());
  },
  verifyDetailsViewIsOpened: () => cy.expect(paneDetailsView.exists()),
  verifyActionMenuAbsent: () => cy.expect(paneDetailsView.find(actionsButton).absent()),
};
