import { PaneSet } from '../../../../interactors';

const ermUsagePaneset = PaneSet({ id: 'udps-paneset' });

export default {
  waitLoading: () => {
    cy.expect(ermUsagePaneset.exists());
  },
};
