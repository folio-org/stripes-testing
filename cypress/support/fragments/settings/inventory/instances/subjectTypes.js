import { including } from '@interactors/html';
import { Button, EditableListRow, MultiColumnListCell } from '../../../../../../interactors';
import DateTools from '../../../../utils/dateTools';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  verifySourceTypeAbsent(name) {
    cy.get('#editList-subjecttypes, #editList-subject-types') // Selects either if present
      .should('exist') // Ensures at least one exists before proceeding
      .as('subjectTypesList');

    cy.get('@subjectTypesList')
      .find('[class*="mclCell-"]:nth-child(1)')
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },

  verifyCreatedSubjectType({ name: subjectSourceName, user, actions = [] }) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });

    cy.do(
      MultiColumnListCell({ content: subjectSourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectSourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: 'local' }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: including(`${date} by ${user.lastName},`) }),
        ]);
        Object.values(reasonsActions).forEach((action) => {
          const buttonSelector = EditableListRow({ index: rowIndex })
            .find(actionsCell)
            .find(Button({ icon: action }));
          if (actions.includes(action)) {
            cy.expect(buttonSelector.exists());
          } else {
            cy.expect(buttonSelector.absent());
          }
        });
      }),
    );
  },
};
