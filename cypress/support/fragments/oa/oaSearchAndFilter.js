import { PaneContent, TextInput } from '../../../../interactors';

export default {
  // check that filter pane is loaded
  waitLoading: () => {
    cy.expect(PaneContent({ id: 'oa-main-filter-pane-content' }).exists());
    cy.expect(TextInput({ id: 'sasq-search-field-publication-requests' }).exists());
  },
};
