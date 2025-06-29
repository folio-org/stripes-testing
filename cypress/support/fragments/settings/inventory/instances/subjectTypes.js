import { including } from '@interactors/html';
import { Button, EditableListRow, MultiColumnListCell } from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';
import DateTools from '../../../../utils/dateTools';

const columnIndex = {
  name: 0,
  source: 1,
  lastUpdated: 2,
  actions: 3,
};
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
    cy.get('#editList-subjecttypes, #editList-subject-types')
      .should('exist')
      .as('subjectTypesList');

    cy.get('@subjectTypesList')
      .find('[class*="mclCell-"]:nth-child(1)')
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },

  // using in C594406, C594405, C594411
  verifySubjectTypeExists({ name, source, user, actions = [] }) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const rowSelector = MultiColumnListCell({ content: name });
    const getRowIndex = (element) => Number(
      element.closest('[data-row-index]').getAttribute('data-row-index').replace('row-', ''),
    );

    cy.do(
      rowSelector.perform((element) => {
        const rowIndex = getRowIndex(element);
        const row = EditableListRow({ index: rowIndex });

        cy.expect([
          row.find(MultiColumnListCell({ columnIndex: columnIndex.name })).has({ content: name }),
          row
            .find(MultiColumnListCell({ columnIndex: columnIndex.source }))
            .has({ content: source }),
          row.find(MultiColumnListCell({ columnIndex: columnIndex.lastUpdated })).has({
            content: including(`${date} by ${user}`),
          }),
        ]);

        const actionsCell = row.find(MultiColumnListCell({ columnIndex: columnIndex.actions }));
        Object.values(reasonsActions).forEach((action) => {
          const actionButton = actionsCell.find(Button({ icon: action }));
          cy.expect(actions.includes(action) ? actionButton.exists() : actionButton.absent());
        });
      }),
    );
  },
};
