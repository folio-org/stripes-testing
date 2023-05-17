import {
  MultiColumnList,
  MultiColumnListCell,
  Link,
  MultiColumnListHeader,
  including,
} from '../../../../interactors';

const resultTable = MultiColumnList({ id: 'circulation-log-list' });

export default {
  clickOnCell(content, row) {
    cy.do(MultiColumnListCell({ content, row }).find(Link()).click());
  },

  checkTableWithoutLinks() {
    cy.expect(resultTable.find(Link()).absent());
  },

  checkTableWithoutColumns(columns) {
    return cy.wrap(Object.values(columns)).each((columnToCheck) => {
      cy.expect(resultTable.find(MultiColumnListHeader({ content: including(columnToCheck) })).absent());
    });
  },
};
