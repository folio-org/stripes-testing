import { including } from '@interactors/html';
import { Button, EditableListRow, MultiColumnListCell } from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';
import DateTools from '../../../../utils/dateTools';

function getSubjectTypeNames() {
  const existingNames = [];
  return cy
    .get('#editList-subject-types')
    .find('[class*="mclCell-"]:nth-child(1)')
    .each(($cell) => {
      cy.wrap($cell).each(($el) => {
        existingNames.push($el.text());
      });
    })
    .then(() => existingNames);
}

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  getSubjectTypeNames,

  createViaApi(body) {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'subject-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  deleteViaApi(id) {
    cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `subject-types/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },

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
