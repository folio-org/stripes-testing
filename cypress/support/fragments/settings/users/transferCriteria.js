import { PaneHeader, Pane } from '../../../../../interactors';

const transferCriteriaPane = Pane({ id: 'pane-batch-group-configuration' });

export default {
  waitLoading: () => cy.expect(transferCriteriaPane.find(PaneHeader('Transfer criteria')).exists()),
};
