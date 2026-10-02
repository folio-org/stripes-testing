import { including, Pane, NavListItem, Select } from '../../../../../interactors';

const rootPane = Pane('Number generator sequences');
const numberGeneratorSequencesButton = NavListItem('Number generator sequences');
const selectListGenerator = Select('Generator');

export const NUMBER_GENERATOR_SEQUENCE_GROUPS = ['Users: Patron barcode', 'Inventory: Call number'];

export default {
  selectFromSettings() {
    cy.expect(numberGeneratorSequencesButton.exists());
    cy.do(numberGeneratorSequencesButton.click());
  },

  waitLoading() {
    cy.expect(rootPane.exists());
  },

  checkSequenceGroupsExist(groups = NUMBER_GENERATOR_SEQUENCE_GROUPS) {
    cy.expect(selectListGenerator.exists());
    groups.forEach((group) => {
      cy.expect(selectListGenerator.has({ optionsText: including(group) }));
    });
  },
};
