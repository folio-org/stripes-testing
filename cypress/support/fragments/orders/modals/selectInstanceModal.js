import {
  Button,
  Modal,
  TextField,
  HTML,
  including,
  MultiColumnListRow,
} from '../../../../../interactors';

const modalSelectProfile = Modal('Select instance');

export default {
  searchByName: (instanceTitle) => {
    cy.do([
      modalSelectProfile.find(TextField({ name: 'query' })).fillIn(instanceTitle),
      modalSelectProfile.find(Button('Search')).click(),
    ]);
    cy.expect(modalSelectProfile.find(HTML(including('1 record found'))).exists());
    cy.expect(modalSelectProfile.find(MultiColumnListRow({ index: 0 })).exists());
  },

  selectInstance: () => {
    cy.do(modalSelectProfile.find(MultiColumnListRow({ index: 0 })).click());
    cy.expect(modalSelectProfile.absent());
  },
};
