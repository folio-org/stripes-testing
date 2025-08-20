import {
  Button,
  EditableListRow,
  including,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  PaneHeader,
  Section,
  TextField,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const rootSection = Section({ id: 'controlled-vocab-pane' });
const rootList = MultiColumnList({ id: 'editList-patrongroups' });
const newButton = rootSection.find(Button({ id: 'clickable-add-patrongroups' }));
const saveButton = rootSection.find(Button({ id: including('clickable-save-patrongroups-') }));
const cancelButton = rootSection.find(Button({ id: including('clickable-cancel-patrongroups-') }));
const patronGroupNameTextField = rootSection.find(TextField({ placeholder: 'group' }));
const descriptionTextField = rootSection.find(TextField({ placeholder: 'desc' }));
const expirationOffsetInDaysTextField = rootSection.find(
  TextField({ placeholder: 'expirationOffsetInDays' }),
);
const deleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const cannotDeleteModal = Modal('Cannot delete Patron group');
const deleteModalButton = deleteModal.find(Button('Delete'));
const cancelModalButton = deleteModal.find(Button('Cancel'));
const okayButton = cannotDeleteModal.find(Button('Okay'));

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

function getMultiColumnListCellsValues() {
  const cells = [];
  // get MultiColumnList rows and loop over
  return cy
    .get('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}
function validateNumsAscendingOrder(prev) {
  const itemsClone = [...prev];
  itemsClone.sort((a, b) => a - b);
  cy.expect(itemsClone).to.deep.equal(prev);
}

export default {
  defaultPatronGroup,
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
    cy.do(
      rootList.find(MultiColumnListCell({ content: including(name) })).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.do(
          rootList
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(MultiColumnListCell({ columnIndex: 4 }))
            .find(Button({ icon: 'edit' }))
            .click(),
        );
      }),
    );
  },
  clickTrashButtonForGroup(name) {
    cy.do(
      MultiColumnListRow({ content: including(name), isContainer: true })
        .find(MultiColumnListCell({ columnIndex: 4 }))
        .find(Button({ icon: 'trash' }))
        .click(),
    );
  },
  clickModalDeleteButton() {
    cy.do(deleteModalButton.click());
    cy.expect(deleteModal.absent());
  },
  clickModalCancelButton() {
    cy.do(cancelModalButton.click());
    cy.expect(deleteModal.absent());
  },
  clickModalOkayButton() {
    cy.do(okayButton.click());
    cy.expect(cannotDeleteModal.absent());
  },
  createViaApi(
    patronGroup = defaultPatronGroup.group,
    description = 'Patron_group_description',
    expirationOffsetInDays = '10',
  ) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'groups',
        isDefaultSearchParamsRequired: false,
        body: {
          group: patronGroup,
          desc: description,
          expirationOffsetInDays,
        },
      })
      .then((response) => {
        return response.body.id;
      });
  },
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
      .then((response) => {
        return response.body.usergroups[0].id;
      });
  },
  getGroupViaApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'groups',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body.usergroups[0];
      });
  },
  clearField(fieldName, patronGroup) {
    if (fieldName === 'Patron group') {
      cy.get(`input[value="${patronGroup.name}"]`)
        .should('be.visible')
        .focus()
        .parent()
        .find('button[icon="times-circle-solid"]')
        .click();
    }
    if (fieldName === 'Description') {
      cy.get(`input[value="${patronGroup.desc}"]`)
        .should('be.visible')
        .focus()
        .parent()
        .find('button[icon="times-circle-solid"]')
        .click();
    }
    if (fieldName === 'Expiration date offset') {
      cy.get(`input[value="${patronGroup.expirationOffsetInDays}"]`)
        .should('be.visible')
        .focus()
        .parent()
        .find('button[icon="times-circle-solid"]')
        .click();
    }
  },

  verifyGroupInTheList({ name, description = '', actions = [] }) {
    const row = MultiColumnListRow({ content: including(name), isContainer: true });
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
    cy.do(
      rootList.find(MultiColumnListCell({ content: including(name) })).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

        cy.expect([
          rootList.find(MultiColumnListRow({ indexRow: rowNumber })).exists(),
          rootList
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(MultiColumnListCell({ columnIndex: 1, content: description }))
            .exists(),
          rootList
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(MultiColumnListCell({ columnIndex: 2, content: expirationDateOffset }))
            .exists(),
          rootList
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(
              MultiColumnListCell({ columnIndex: 3, content: including(`${date} by ${userName}`) }),
            )
            .exists(),
        ]);
        actions.forEach((action) => {
          const buttonSelector = rootList
            .find(MultiColumnListRow({ indexRow: rowNumber }))
            .find(MultiColumnListCell({ columnIndex: 4 }))
            .find(Button({ icon: action }));
          cy.expect(buttonSelector.exists());
        });
      }),
    );
  },
  verifyEditedGroupInTheList(patronGroup) {
    cy.get(`input[value="${patronGroup.name}"]`).then(($input) => {
      const rowElement = $input.closest('[data-row-index]');
      const row = rowElement.attr('data-row-index');

      cy.get(`[data-row-index="${row}"]`)
        .find(`input[value="${patronGroup.name}"]`)
        .should('be.focused');
      cy.get(`[data-row-index="${row}"]`).find('input[placeholder="desc"]').should('be.enabled');
      cy.get(`[data-row-index="${row}"]`)
        .find('input[placeholder="expirationOffsetInDays"]')
        .should('be.enabled');
      cy.get(`[data-row-index="${row}"]`)
        .find('div[class*="lastUpdated-"]')
        .should('contain.text', patronGroup.currentDate)
        .find('a')
        .invoke('text')
        .then((text) => {
          expect(text.trim()).to.equal(patronGroup.userName);
        });
      cy.get(`[data-row-index="${row}"]`)
        .find('[id*="clickable-cancel-patrongroups"]')
        .should('be.enabled');
      cy.get(`[data-row-index="${row}"]`)
        .find('[id*="clickable-save-patrongroups"]')
        .should('be.disabled');
    });
  },

  verifyGroupAbsentInTheList({ name }) {
    cy.do(rootList.find(MultiColumnListCell({ content: including(name) })).absent());
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
  verifyPatronGroupsSortingOrder() {
    getMultiColumnListCellsValues().then((cells) => {
      validateNumsAscendingOrder(cells);
    });
  },
  verifyActionsCells() {
    cy.get('#editList-patrongroups')
      .find('[class^=editListRow-]')
      .each(($row) => {
        cy.wrap($row)
          .children()
          .eq(4)
          .invoke('text')
          .then((text) => {
            expect(text).to.equal('');
          });
      });
  },
  verifyDeletePatronGroupModal() {
    cy.expect([deleteModal.exists(), cancelModalButton.exists(), deleteModalButton.exists()]);
  },
  verifyCannotDeletePatronGroupModal() {
    cy.expect([
      cannotDeleteModal.exists(),
      Modal({
        content: including(
          'This Patron group cannot be deleted, as it is in use by one or more records.',
        ),
      }).exists(),
      okayButton.exists(),
    ]);
  },
};
