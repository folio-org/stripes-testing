import {
  Button,
  EditableListRow,
  including,
  MultiColumnListCell,
} from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';
import DateTools from '../../../../utils/dateTools';

export const actionButtons = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  createViaApi(body) {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'subject-sources',
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
      path: `subject-sources/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  // using in C594428, C594429, C594434
  verifySubjectSourceExists(sourceName, source, user, options = {}) {
    const { actions = [] } = options;
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });

    cy.do(
      MultiColumnListCell({ content: sourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: sourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: source }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: including(`${date} by ${user}`) }),
        ]);
        Object.values(actionButtons).forEach((action) => {
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
  // using in C594434
  verifySubjectSourceAbsent(name) {
    cy.get('#controlled-vocab-pane')
      .find('[class*="mclCell-"]:nth-child(1)')
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },
};
