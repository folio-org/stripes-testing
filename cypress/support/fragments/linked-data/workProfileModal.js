import { Button } from '../../../../interactors';

const profileModalSelector = '[data-testid="modal-choose-profile-content"]';
const createButton = Button({ dataTestID: 'modal-button-submit' });

export default {
  waitLoading() {
    cy.get(profileModalSelector).should('be.visible');
  },

  checkOptionSelected(option) {
    cy.get(`${profileModalSelector} select#select-profile option:selected`).should(
      'have.text',
      option,
    );
  },

  selectDefaultOption() {
    cy.do(createButton.click());
    cy.wait(1000);
  },

  verifyModalIsAbsent() {
    cy.get(profileModalSelector).should('not.exist');
  },
};
