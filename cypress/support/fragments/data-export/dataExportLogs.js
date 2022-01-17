import { MultiColumnListCell, Button, including } from '../../../../interactors';

export default {
  saveMarcFileForImport:(fileName) => {
    cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).find(Button({ text: including(fileName) })).click());
  },
};
