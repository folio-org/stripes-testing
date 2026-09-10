import { Selection, including } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Selection('Select default order template*').exists());
  },

  verifyDefaultOrderTemplateSelected(templateName) {
    cy.expect(Selection({ value: including(templateName) }).exists());
  },
};
