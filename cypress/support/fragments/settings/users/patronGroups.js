import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import {
  PaneHeader,
  Section,
  Button,
  TextField,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
} from '../../../../../interactors';

const rootSection = Section({ id: 'controlled-vocab-pane' });
const newButton = rootSection.find(Button({ id: 'clickable-add-patrongroups' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-patrongroups-') }));
const patronGroupNameTextField = rootSection.find(TextField({ placeholder: 'group' }));

const defaultPatronGroup = {
  group: `Patron_group_${getRandomPostfix()}`,
  desc: 'Patron_group_description',
  expirationOffsetInDays: '10',
};

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  waitLoading: () => cy.expect(rootSection.find(PaneHeader('Patron groups')).exists()),
  create: (patronGroup) => {
    cy.do(newButton.click());
    cy.do(patronGroupNameTextField.fillIn(patronGroup));
    cy.do(saveButton.click());
  },
  createViaApi: (patronGroup = defaultPatronGroup.group) => cy
    .okapiRequest({
      method: 'POST',
      path: 'groups',
      isDefaultSearchParamsRequired: false,
      body: {
        id: uuid(),
        group: patronGroup,
      },
    })
    .then((response) => response.body.id),
  deleteViaApi: (patronGroupId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `groups/${patronGroupId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  verifyGroupInTheList({ name, description = '', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: description })).exists(),
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

  verifyGroupAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickEditButtonForGroup(name) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.do(
      row
        .find(actionsCell)
        .find(Button({ icon: 'edit' }))
        .click(),
    );
  },

  clickTrashButtonForGroup(name) {
    cy.do([
      MultiColumnListRow({ content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 4 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
