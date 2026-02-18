import { including } from '@interactors/html';
import {
  Button,
  EditableListRow,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
  TextField,
} from '../../../../../../interactors';
import { REQUEST_METHOD } from '../../../../constants';
import DateTools from '../../../../utils/dateTools';
import DeleteCancelReason from '../../../consortium-manager/modal/delete-cancel-reason';

const rootPane = Pane('Subject types');
const modalWithErrorMessage = Modal('Cannot delete Subject type');
const newButton = Button('+ New');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');

const COLUMN_INDEX = {
  NAME: 0,
  SOURCE: 1,
  LAST_UPDATED: 2,
  ACTIONS: 3,
};

export const ACTION_BUTTONS = {
  EDIT: 'edit',
  TRASH: 'trash',
};

export const FOLIO_SUBJECT_TYPES = [
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

function getRowIndex(element) {
  return Number(
    element.closest('[data-row-index]').getAttribute('data-row-index').replace('row-', ''),
  );
}

export default {
  createViaApi(body) {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'subject-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => response);
  },

  deleteViaApi(id) {
    cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `subject-types/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  getSubjectTypesViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'subject-types',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.subjectTypes;
      });
  },

  waitLoading() {
    ['Name', 'Source', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },

  verifySubjectTypeAbsent(name) {
    cy.get('#editList-subjecttypes, #editList-subject-types')
      .should('exist')
      .as('subjectTypesList');

    cy.get('@subjectTypesList')
      .find(`[class*="mclCell-"]:nth-child(${COLUMN_INDEX.NAME + 1})`)
      .each(($cell) => {
        cy.wrap($cell).invoke('text').should('not.eq', name);
      });
  },

  verifySubjectTypeExists({ name, source, user, actions = [] }) {
    const today = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const rowSelector = MultiColumnListCell({ content: name });

    cy.do(
      rowSelector.perform((element) => {
        const rowIndex = getRowIndex(element);
        const row = EditableListRow({ index: rowIndex });

        cy.expect([
          row.find(MultiColumnListCell({ columnIndex: COLUMN_INDEX.NAME })).has({ content: name }),
          row
            .find(MultiColumnListCell({ columnIndex: COLUMN_INDEX.SOURCE }))
            .has({ content: source }),
          row
            .find(MultiColumnListCell({ columnIndex: COLUMN_INDEX.LAST_UPDATED }))
            .has({ content: including(`${today} by ${user}`) }),
        ]);

        const actionsCell = row.find(MultiColumnListCell({ columnIndex: COLUMN_INDEX.ACTIONS }));
        Object.values(ACTION_BUTTONS).forEach((action) => {
          const actionButton = actionsCell.find(Button({ icon: action }));
          cy.expect(actions.includes(action) ? actionButton.exists() : actionButton.absent());
        });
      }),
    );
  },

  createSubjectType(value, rowIndex = 0) {
    cy.do([newButton.click(), TextField({ name: `items[${rowIndex}].name` }).fillIn(value)]);
  },

  deleteSubjectType(name) {
    const actionsCell = MultiColumnListCell({ columnIndex: COLUMN_INDEX.ACTIONS });
    const rowSelector = MultiColumnListCell({ content: name });
    cy.do(
      rowSelector.perform((element) => {
        const rowIndex = getRowIndex(element);
        const row = EditableListRow({ index: rowIndex });

        cy.do(
          row
            .find(actionsCell)
            .find(Button({ icon: ACTION_BUTTONS.TRASH }))
            .click(),
        );
      }),
    );
  },

  confirmDeletionOfSubjectType(name) {
    DeleteCancelReason.waitLoadingDeleteModal('Subject type', name);
    DeleteCancelReason.clickDelete();
  },

  verifySubjectTypeCannotBeDeleted() {
    cy.expect(
      modalWithErrorMessage.has({
        content: including(
          'This Subject type cannot be deleted, as it is in use by one or more records.',
        ),
      }),
    );
    cy.do(Button('Okay').click());
    cy.expect(modalWithErrorMessage.absent());
  },

  validateNameFieldWithError(message) {
    cy.get('#controlled-vocab-pane')
      .find('input[name*="items["][name*="].name"]')
      .should('exist')
      .then(($inputs) => {
        const nameAttr = $inputs.first().attr('name');
        const indexMatch = nameAttr.match(/items\[(\d+)\]\.name/);
        if (indexMatch) {
          const rowIndex = parseInt(indexMatch[1], 10);
          cy.expect([
            TextField({ name: `items[${rowIndex}].name` }).has({ error: message }),
            cancelButton.has({ disabled: false }),
            saveButton.has({ disabled: true }),
          ]);
        }
      });
    cy.wait(1000);
  },
};
