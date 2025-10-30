import {
  Button,
  Modal,
  TextField,
  HTML,
  including,
  MultiColumnListCell,
  MultiColumnListHeader,
  Checkbox,
} from '../../../../interactors';

const selectUserModal = Modal('Select User');

export default {
  verifySelectUserModalExists: () => {
    cy.expect(selectUserModal.exists());
  },

  verifySelectUserModalClosed: () => {
    cy.expect(selectUserModal.absent());
  },

  searchUser: (userName) => {
    cy.do(TextField({ name: 'query' }).fillIn(userName));
    cy.do(Button('Search').click());
    cy.expect(selectUserModal.find(HTML(including('1 record found'))).exists());
  },

  verifyUserFoundInResults: (userName) => {
    cy.expect(selectUserModal.find(MultiColumnListCell(userName)).exists());
  },

  filterByPatronGroup: (patronGroupName) => {
    cy.do(selectUserModal.find(Checkbox(patronGroupName)).click());
  },

  clearAllFilters: () => {
    cy.do(Button('Reset all').click());
    cy.wait(1000);
  },

  sortByColumn: (columnName) => {
    cy.do(selectUserModal.find(MultiColumnListHeader(columnName)).click());
    cy.wait(10000);
  },

  checkAllValuesInColumnSorted: (columnIndex) => {
    return cy.then(() => {
      return cy.wrap(null).then(() => {
        return cy.get('[class^="mclRow-"]').then(($rows) => {
          const cellValues = [];
          $rows.each((_, row) => {
            const cell = row.querySelectorAll('[class^="mclCell-"]')[columnIndex];
            if (cell) {
              const cellText = cell.textContent.trim();
              if (cellText) cellValues.push(cellText);
            }
          });

          // Extract numeric part before dot for comparison
          const numericValues = cellValues.map((value) => {
            const match = value.match(/(\d+)\.?/);
            return match ? parseInt(match[1], 10) : 0;
          });

          // Check if numeric values are sorted (ascending OR descending)
          const sortedDescending = numericValues.slice().sort((a, b) => b - a);

          // Check if values match either ascending or descending order
          const isDescending = JSON.stringify(numericValues) === JSON.stringify(sortedDescending);

          return cy.expect(isDescending).to.be.true;
        });
      });
    });
  },

  selectUserFromList: (userName) => {
    cy.do(selectUserModal.find(MultiColumnListCell(userName)).click());
    cy.expect(selectUserModal.absent());
  },
};
