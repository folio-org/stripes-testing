import uuid from 'uuid';
import {
  Button,
  EditableListRow,
  including,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  PaneHeader,
  Section,
  TextField,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const rootSection = Section({ id: 'controlled-vocab-pane' });
const newButton = rootSection.find(Button({ id: 'clickable-add-patrongroups' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-patrongroups-') }));
const cancelButton = rootSection.find(Button({ id: including('clickable-cancel-patrongroups-') }));
const patronGroupNameTextField = rootSection.find(TextField({ placeholder: 'group' }));
const descriptionTextField = rootSection.find(TextField({ placeholder: 'desc' }));
const expirationOffsetInDaysTextField = rootSection.find(
  TextField({ placeholder: 'expirationOffsetInDays' }),
);

const defaultPatronGroup = {
  group: `Patron_group_${getRandomPostfix()}`,
  desc: 'Patron_group_description',
  expirationOffsetInDays: '10',
};

export const tableColumnHeaderNames = [
  'Patron group',
  'Description',
  'Expiration date offset (days)',
  'Last updated',
  'Actions',
];

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

function clickNewButton() {
  cy.do(newButton.click());
}

function clickCancelButton() {
  cy.do(cancelButton.click());
}

function clickSaveButton() {
  cy.do(saveButton.click());
}

function fillPatronGroupName(patronGroup) {
  cy.do(patronGroupNameTextField.fillIn(patronGroup));
  cy.expect([
    patronGroupNameTextField.has({ value: patronGroup }),
    saveButton.has({ disabled: false }),
  ]);
}

function fillDescription(description) {
  cy.do(descriptionTextField.fillIn(description));
  cy.expect(descriptionTextField.has({ value: description }));
}

function fillExpirationDateOffset(value) {
  cy.do(expirationOffsetInDaysTextField.fillIn(value));
}

export default {
  clickNewButton,
  clickCancelButton,
  clickSaveButton,
  fillPatronGroupName,
  fillDescription,
  fillExpirationDateOffset,
  waitLoading: () => cy.expect(rootSection.find(PaneHeader('Patron groups')).exists()),
  create: (patronGroup) => {
    clickNewButton();
    cy.do(patronGroupNameTextField.fillIn(patronGroup));
    cy.do(saveButton.click());
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
  getGroupIdViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'groups',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((usergroups) => {
        return usergroups[0].id;
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
  verifyCreatedGroupInTheList({
    name,
    description,
    expirationDateOffset,
    date,
    userName,
    actions = [],
  }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: description })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 2, content: expirationDateOffset })).exists(),
      row
        .find(MultiColumnListCell({ columnIndex: 3, content: including(`${date} by ${userName}`) }))
        .exists(),
    ]);
    actions.forEach((action) => {
      const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
      cy.expect(buttonSelector.exists());
    });
  },
  verifyGroupAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },
  verifyNewRowForGroupInTheList() {
    cy.expect([
      patronGroupNameTextField.has({ value: '', disabled: false }),
      descriptionTextField.has({ value: '', disabled: false }),
      expirationOffsetInDaysTextField.has({ value: '', disabled: false }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: '-' }),
      cancelButton.has({ disabled: false }),
      saveButton.has({ disabled: true }),
    ]);
  },
  verifyPatronGroupsPane() {
    cy.expect(newButton.has({ disabled: false }));
    tableColumnHeaderNames.forEach((name) => {
      cy.expect(MultiColumnListHeader(name).exists());
    });
  },
  verifyWarningMessageForField(message, notFilled) {
    if (notFilled === true) {
      cy.expect([
        rootSection.find(TextField({ error: message })).exists(),
        saveButton.has({ disabled: true }),
      ]);
    } else {
      cy.expect([
        rootSection.find(TextField({ error: message })).absent(),
        saveButton.has({ disabled: false }),
      ]);
    }
  },
};
