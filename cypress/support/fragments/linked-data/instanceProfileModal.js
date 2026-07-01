import { Button } from '../../../../interactors';

const instanceProfileModal = '[data-testid="modal-choose-profile-content"]';
const submitButton = Button({ dataTestID: 'modal-button-submit' });

export default {
  waitLoading() {
    cy.get(instanceProfileModal).should('be.visible');
  },
  checkOptionSelected(option) {
    cy.get(`${instanceProfileModal} select#select-profile option:selected`).should(
      'have.text',
      option,
    );
  },
  selectDefaultOption() {
    cy.do(submitButton.click());
    cy.wait(1000);
  },
  verifyModalIsAbsent() {
    cy.get(instanceProfileModal).should('not.exist');
  },
  closeProfileModal() {
    cy.do(Button({ ariaLabel: 'Close Basic modal' }).click());
    cy.wait(500);
  },
};
