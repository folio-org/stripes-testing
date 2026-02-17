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

const rootPane = Pane('Subject sources');
const modalWithErrorMessage = Modal('Cannot delete Subject source');
const newButton = Button('+ New');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
// const nameField = TextField({ name: 'items[0].name' });

const COLUMN_INDEX = {
  NAME: 0,
  CODE: 1,
  SOURCE: 2,
  LAST_UPDATED: 3,
  ACTIONS: 4,
};

export const FOLIO_SUBJECT_SOURCES = [
  'Library of Congress Subject Headings',
  'Répertoire de vedettes-matière',
  'Source not specified',
  'Medical Subject Headings',
  'Canadian Subject Headings',
  "Library of Congress Children's and Young Adults' Subject Headings",
  'National Agricultural Library subject authority file',
];

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

  deleteSubjectSource(name) {
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

  create(value, rowIndex = 0) {
    cy.do([newButton.click(), TextField({ name: `items[${rowIndex}].name` }).fillIn(value)]);
  },

  editSubjectSourceName(oldValue, newValue) {
    const actionsCell = MultiColumnListCell({ columnIndex: COLUMN_INDEX.ACTIONS });
    const rowSelector = MultiColumnListCell({ content: oldValue });
    cy.do(
      rowSelector.perform((element) => {
        const rowIndex = getRowIndex(element);
        const row = EditableListRow({ index: rowIndex });

        cy.do([
          row
            .find(actionsCell)
            .find(Button({ icon: ACTION_BUTTONS.EDIT }))
            .click(),
          TextField({ name: `items[${rowIndex}].name` }).fillIn(newValue),
        ]);
      }),
    );
  },

  validateButtonsState({ cancel = 'enabled', save = 'enabled' } = {}) {
    const cancelButtonState = cancel === 'enabled' ? { disabled: false } : { disabled: true };
    const saveButtonState = save === 'enabled' ? { disabled: false } : { disabled: true };

    cy.expect([saveButton.has(saveButtonState), cancelButton.has(cancelButtonState)]);
  },

  confirmDeletionOfSubjectSource(name) {
    DeleteCancelReason.waitLoadingDeleteModal('Subject source', name);
    DeleteCancelReason.clickDelete();
  },

  verifySubjectSourceCannotBeDeleted() {
    cy.expect(
      modalWithErrorMessage.has({
        content: including(
          'This Subject source cannot be deleted, as it is in use by one or more records.',
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
