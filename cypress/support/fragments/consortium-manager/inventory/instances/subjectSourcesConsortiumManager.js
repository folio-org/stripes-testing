import { including } from '@interactors/html';
import {
  Button,
  Checkbox,
  EditableListRow,
  Modal,
  MultiColumnListCell,
  MultiColumnListHeader,
  Pane,
  TextField,
} from '../../../../../../interactors';
import DateTools from '../../../../utils/dateTools';
import InteractorsTools from '../../../../utils/interactorsTools';
import ConsortiumManagerApp from '../../consortiumManagerApp';

const newButton = Button('+ New');
const saveButton = Button('Save');
const cancelButton = Button('Cancel');
const nameField = TextField({ name: 'items[0].name' });
const shareToAllModal = Modal({ id: 'share-controlled-vocab-entry-confirmation' });
const confirmButton = shareToAllModal.find(Button('Confirm'));
const rootPane = Pane({ id: 'consortia-controlled-vocabulary-pane' });

function clickNewButton() {
  cy.do(newButton.click());
}

function enableShareCheckbox() {
  cy.do(Checkbox('Share').click());
}

function clickSaveButton() {
  cy.do(saveButton.click());
}

function clickCancelButton() {
  cy.do(cancelButton.click());
}

function fillNameField(value) {
  cy.do(nameField.fillIn(value));
}

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export default {
  clickNewButton,
  clickSaveButton,
  clickCancelButton,
  enableShareCheckbox,
  fillNameField,
  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Subject sources');
    cy.expect(newButton.is({ disabled: false }));
    ['Name', 'Code', 'Source', 'Last updated', 'Member libraries', 'Actions'].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },

  validateNameFieldConditions(nameValue, isUnique) {
    cy.expect(nameField.has({ placeholder: 'name' }));
    fillNameField(nameValue);
    enableShareCheckbox();

    if (!nameValue) {
      clickSaveButton();
      cy.expect(nameField.has({ error: 'Please fill this in to continue' }));
      saveButton.has({ disabled: false });
    } else if (!isUnique) {
      clickSaveButton();
      cy.expect(
        nameField.has({ error: 'Name is already in use at one or more member libraries.' }),
      );
      saveButton.has({ disabled: false });
    } else {
      clickSaveButton();
    }
  },

  confirmSharing(subjectSourceName) {
    this.verifyShareToAllModal(subjectSourceName);
    cy.do(confirmButton.click());
    cy.expect([shareToAllModal.absent(), rootPane.exists()]);
    InteractorsTools.checkCalloutMessage(
      `${subjectSourceName} was successfully created for All libraries.`,
    );
  },

  createAndCancelRecord(subjectSourceName) {
    clickNewButton();
    fillNameField(subjectSourceName);
    clickCancelButton();
    cy.expect(rootPane.find(MultiColumnListCell({ content: subjectSourceName })).absent());
  },

  getSourceSubjectIdViaApi(name) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'consortia/1f06c60e-4431-432d-97a4-ca2bc6b152cb/publications',
        body: {
          url: '/subject-sources?limit=2000&offset=0',
          method: 'GET',
          tenants: [
            'cs00000int',
            'cs00000int_0001',
            'cs00000int_0006',
            'cs00000int_0007',
            'cs00000int_0011',
            'cs00000int_0009',
            'cs00000int_0002',
            'cs00000int_0008',
            'cs00000int_0003',
            'cs00000int_0004',
            'cs00000int_0005',
            'cs00000int_0010',
          ],
          payload: {},
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return cy
          .okapiRequest({
            path: `consortia/1f06c60e-4431-432d-97a4-ca2bc6b152cb/publications/${response.body.id}/results`,
            isDefaultSearchParamsRequired: false,
          })
          .then((resp) => {
            const parsedResponse = JSON.parse(resp.body.publicationResults[0].response);
            const item = parsedResponse.subjectSources.find((obj) => obj.name === name);
            return item.id;
          });
      });
  },

  deleteViaApi(publicationId, name) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `consortia/1f06c60e-4431-432d-97a4-ca2bc6b152cb/sharing/settings/${publicationId}`,
      body: {
        url: '/subject-sources',
        settingId: publicationId,
        payload: {
          id: publicationId,
          name,
          source: 'consortium',
        },
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  verifyNewRowForSubjectSourceInTheList() {
    cy.expect([
      newButton.has({ disabled: true }),
      Button('Select members').has({ disabled: true }),
      TextField({ name: 'items[0].name' }).has({ placeholder: 'name', disabled: false }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: 'local' }),
      EditableListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .has({ content: 'No value set-' }),
      Checkbox('Share').has({ checked: false }),
      Button('Cancel').has({ disabled: false }),
      Button('Save').has({ disabled: false }),
    ]);
  },

  verifyShareToAllModal(subjectSourceName) {
    cy.expect([
      shareToAllModal.exists(),
      Modal({
        content: including(`Are you sure you want to share ${subjectSourceName} with ALL members?`),
      }).exists(),
      shareToAllModal.find(Button('Keep editing')).has({ disabled: false }),
      confirmButton.has({ disabled: false }),
    ]);
  },

  verifyCreatedSubjectSource({ name: subjectSourceName, actions = [] }) {
    const date = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
    const actionsCell = MultiColumnListCell({ columnIndex: 5 });

    cy.do(
      MultiColumnListCell({ content: subjectSourceName }).perform((element) => {
        const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');
        const rowIndex = Number(rowNumber.slice(4));

        cy.expect([
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: subjectSourceName }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: 'consortium' }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: `${date} by SystemConsortia  ` }),
          EditableListRow({ index: rowIndex })
            .find(MultiColumnListCell({ columnIndex: 4 }))
            .has({ content: 'All' }),
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
