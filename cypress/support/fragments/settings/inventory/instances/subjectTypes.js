import { including } from '@interactors/html';
import { Button, EditableListRow, MultiColumnListCell } from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';
import DateTools from '../../../../utils/dateTools';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export const folioSubjectTypes = [
  'Personal name',
  'Corporate name',
  'Meeting name',
  'Uniform title',
  'Named event',
  'Chronological term',
  'Topical term',
  'Geographic name',
  'Uncontrolled',
  'Faceted topical terms',
  'Genre/form',
  'Occupation',
  'Function',
  'Curriculum objective',
  'Hierarchical place name',
  'Type of entity unspecified',
];

export default {
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

  verifySubjectTypeAbsent(name) {
    cy.get('#editList-subjecttypes, #editList-subject-types') // Selects either if present
      .should('exist') // Ensures at least one exists before proceeding
      .as('subjectTypesList');

    cy.get('@subjectTypesList')
      .find('[class*="mclCell-"]:nth-child(1)')
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },

  verifyCreatedSubjectType({ name: subjectSubjectName, user, actions = [] }) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });

    cy.do(
      MultiColumnListCell({ content: subjectSubjectName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectSubjectName }),
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

  // using in C594406, C594405
  verifySubjectTypeExists(subjectTypeName, source = 'local', user, options = {}) {
    const { actions = [] } = options;
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const actionsCell = MultiColumnListCell({ columnIndex: 3 });

    cy.do(
      MultiColumnListCell({ content: subjectTypeName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectTypeName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: source }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: `${date} by ${user}` }),
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
