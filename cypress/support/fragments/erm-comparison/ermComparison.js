import { PaneSet } from '../../../../interactors';

const comparisonPaneSet = PaneSet({ id: 'erm-comparisons-paneset' });

export default {
  waitLoading: () => {
    cy.expect(comparisonPaneSet.exists());
  },
};
