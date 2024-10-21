import { Button, Pane } from '../../../../interactors';

const searchButton = Button({ dataTestID: 'id-search-button' });
const searchPane = Pane('Search');

export default {
  waitLoading: () => {
    cy.expect([searchPane.exists(), searchButton.exists()]);
  },
};
