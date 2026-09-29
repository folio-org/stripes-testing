import { including, MultiColumnListCell, Pane } from '../../../../../interactors';

// TODO: confirm exact pane title and row markup against the real ui-service-interaction app
const rootPane = Pane('Number generator sequences');

export const NUMBER_GENERATOR_SEQUENCE_GROUPS = ['Users: Patron barcode', 'Inventory: Call number'];

export default {
  waitLoading() {
    cy.expect(rootPane.exists());
  },

  checkSequenceGroupsExist(groups = NUMBER_GENERATOR_SEQUENCE_GROUPS) {
    groups.forEach((group) => {
      cy.expect(rootPane.find(MultiColumnListCell(including(group))).exists());
    });
  },
};
