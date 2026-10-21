import {
  Button,
  EditableListRow,
  including,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  NavListItem,
  Pane,
  TextField,
} from '../../../../../../interactors';
import InteractorsTools from '../../../../utils/interactorsTools';

const sectionName = 'Instance note types';
const rootPane = Pane(sectionName);
const actionsCell = MultiColumnListCell({ columnIndex: 3 });

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
export default {
  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'instance-note-types',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `instance-note-types/${id}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }),
  verifyConsortiumInstanceNoteTypesInTheList({ name, source = 'consortium', actions = [] }) {
    const row = MultiColumnListRow({
      content: including(name),
      isContainer: false,
    });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: source })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    } else {
      Object.values(reasonsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyLocalInstanceNoteTypesInTheList({ name, source = 'local', actions = [] }) {
    const row = MultiColumnListRow({
      content: including(name),
      isContainer: false,
    });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: source })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: '' }));
    } else {
      Object.values(reasonsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyFolioInstanceNoteTypesInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.exists());
  },

  verifyInstanceNoteTypesAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForInstanceNoteTypes(name) {
    cy.do([
      MultiColumnListRow({ content: including(name), isContainer: false })
        .find(actionsCell)
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
  editInstanceNoteTypeName(oldName, newName) {
    const rowSelector = MultiColumnListCell({ content: oldName });
    cy.do(
      rowSelector.perform((element) => {
        const rowIndex = Number(
          element.closest('[data-row-index]').getAttribute('data-row-index').replace('row-', ''),
        );
        cy.do([
          EditableListRow({ index: rowIndex })
            .find(actionsCell)
            .find(Button({ icon: 'edit' }))
            .click(),
          TextField({ name: `items[${rowIndex}].name` }).fillIn(newName),
          Button('Save').click(),
        ]);
      }),
    );
  },

  verifyInstanceNoteTypeUpdatedCallout(name) {
    InteractorsTools.checkCalloutContainsMessage(`${name} was successfully updated`);
  },

  waitLoading() {
    ['Name', 'Source', 'Last updated', 'Actions'].forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },

  verifyNewButtonActive() {
    cy.expect(rootPane.find(Button('New')).has({ disabled: false }));
  },

  choose() {
    cy.do([NavListItem(sectionName).click(), rootPane.exists()]);
  },
};
