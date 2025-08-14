import {
  Button,
  EditableListRow,
  including,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
} from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';
import DateTools from '../../../../utils/dateTools';

const rootPane = Pane('Subject sources');

const COLUMN_INDEX = {
  NAME: 0,
  CODE: 1,
  SOURCE: 2,
  LAST_UPDATED: 3,
  ACTIONS: 4,
};

export const ACTION_BUTTONS = {
  EDIT: 'edit',
  TRASH: 'trash',
};

function getRowIndex(element) {
  const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
  return Number(rowNumber.slice(4));
}

export default {
  createViaApi(body) {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'subject-sources',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => response);
  },

  deleteViaApi(id) {
    cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `subject-sources/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  getSubjectSourcesViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'subject-sources',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.subjectSources;
      });
  },

  waitLoading() {
    ['Name', 'Source', 'Code', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },

  verifySubjectSourceExists(sourceName, source, user, options = {}) {
    const { actions = [] } = options;
    const today = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const actionsCell = MultiColumnListCell({ columnIndex: COLUMN_INDEX.ACTIONS });
    const rowSelector = MultiColumnListCell({ content: sourceName });

    cy.do(
      rowSelector.perform((element) => {
        const rowIndex = getRowIndex(element);
        const row = EditableListRow({ index: rowIndex });

        cy.expect([
          row
            .find(MultiColumnListCell({ columnIndex: COLUMN_INDEX.NAME }))
            .has({ content: sourceName }),
          row
            .find(MultiColumnListCell({ columnIndex: COLUMN_INDEX.SOURCE }))
            .has({ content: source }),
          row
            .find(MultiColumnListCell({ columnIndex: COLUMN_INDEX.LAST_UPDATED }))
            .has({ content: including(`${today} by ${user}`) }),
        ]);
        Object.values(ACTION_BUTTONS).forEach((action) => {
          const buttonSelector = EditableListRow({ index: rowIndex })
            .find(actionsCell)
            .find(Button({ icon: action }));
          cy.expect(actions.includes(action) ? buttonSelector.exists() : buttonSelector.absent());
        });
      }),
    );
  },

  verifySubjectSourceAbsent(name) {
    cy.get('#controlled-vocab-pane')
      .find(`[class*="mclCell-"]:nth-child(${COLUMN_INDEX.NAME + 1})`)
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },
};
