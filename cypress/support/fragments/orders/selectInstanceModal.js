import { Button, Modal, TextField, HTML, including, MultiColumnListCell, MultiColumnListRow } from '../../../../../interactors';

const modalSelectProfile = Modal('Select instance');

export default {
  searchByName: (instanceTitle) => {
    cy.do([
      modalSelectProfile.find(TextField({ name: 'query' })).fillIn(instanceTitle),
      modalSelectProfile.find(Button('Search')).click()]);
    cy.expect(modalSelectProfile.find(HTML(including('1 record found'))).exists());
    cy.expect(modalSelectProfile.find(MultiColumnListRow({ index: 0 })).exists());
    cy.expect(modalSelectProfile.find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell(instanceTitle)).exists());
    cy.expect(modalSelectProfile.find(MultiColumnListRow({ index: 1 })).absent());
  },

  selectInstance: (instanceTitle) => {
    cy.do(modalSelectProfile.find(MultiColumnListCell(instanceTitle)).click());
    cy.expect(modalSelectProfile.absent());
  }
};
