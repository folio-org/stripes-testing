import uuid from 'uuid';
import { REQUEST_METHOD } from '../../../constants';
import {
  Button,
  MultiColumnListCell,
  MultiColumnListRow,
  including,
  MultiColumnListHeader,
  PaneSet,
  TextField,
  Checkbox,
  calloutTypes,
  HTML,
  PaneHeader,
} from '../../../../../interactors';
import ConsortiumManagerApp from '../consortiumManagerApp';
import InteractorsTools from '../../../utils/interactorsTools';

const id = uuid();

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};

export const messages = {
  created: ({ name, members }) => `${name} was successfully created for ${members} libraries.`,
  updated: ({ name, members }) => `${name} was successfully updated for ${members} libraries.`,
  deleted: ({ name }) => `The cancel reason ${name} was successfully deleted`,
  noPermission: (members) => `You do not have permissions at one or more members: ${members}`,
  pleaseFillIn: 'Please fill this in to continue',
  notUnique: 'Name is already in use at one or more member libraries.',
};

const rootPane = PaneSet({
  id: 'consortia-controlled-vocabulary-paneset-request-cancellation-reasons',
});
const newButton = rootPane.find(Button('+ New'));
const cancelReasonField = rootPane.find(TextField({ placeholder: 'name' }));
const cancelDescriptionInternalField = rootPane.find(TextField({ placeholder: 'description' }));
const cancelDescriptionPublicField = rootPane.find(TextField({ placeholder: 'publicDescription' }));
const memberLibrariesShare = rootPane.find(Checkbox({ labelText: 'Share' }));
const cancelButton = rootPane.find(Button('Cancel'));
const saveButton = rootPane.find(Button('Save'));

export default {
  createViaApi: (reason) => {
    return cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.POST,
        path: `consortia/${consortiaId}/sharing/settings`,
        body: {
          url: '/cancellation-reason-storage/cancellation-reasons',
          settingId: id,
          payload: {
            id,
            name: reason.payload.name,
          },
        },
      }).then(() => {
        reason.url = '/cancellation-reason-storage/cancellation-reasons';
        reason.settingId = id;
        return reason;
      });
    });
  },

  deleteViaApi: (reason) => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.DELETE,
        path: `consortia/${consortiaId}/sharing/settings/${reason.settingId}`,
        body: reason,
      });
    });
  },

  waitLoading: () => {
    cy.expect(rootPane.find(PaneHeader('Request cancellation reasons')).exists());
  },

  clickNew: () => {
    cy.do(newButton.click());
  },

  verifyNewButtonDisabled(status = true) {
    cy.expect(newButton.is({ disabled: status }));
  },

  verifyEditModeElementsIsActive: () => {
    cy.expect([
      newButton.is({ disabled: true }),
      cancelReasonField.exists(),
      cancelDescriptionInternalField.exists(),
      cancelDescriptionPublicField.exists(),
      memberLibrariesShare.is({ disabled: false }),
      cancelButton.is({ disabled: false }),
      saveButton.is({ disabled: false }),
    ]);
  },

  fillInCancelReasonName: (name) => {
    cy.do(cancelReasonField.fillIn(name));
  },

  fillInInternalDescription: (description) => {
    cy.do(cancelDescriptionInternalField.fillIn(description));
  },

  fillInPublicDescription: (publicDescription) => {
    cy.do(cancelDescriptionPublicField.fillIn(publicDescription));
  },

  createViaUi({ name, description, publicDescription, shared }) {
    this.clickNew();
    this.verifyNewButtonDisabled();
    this.verifyEditModeElementsIsActive();
    this.fillInCancelReasonName(name);
    this.fillInInternalDescription(description);
    this.fillInPublicDescription(publicDescription);
    cy.do(shared && memberLibrariesShare.click());
  },

  clickCancel: () => {
    cy.do(cancelButton.click());
  },

  clickSave: () => {
    cy.do(saveButton.click());
  },

  performAction: (cancelReasonName, action) => {
    // actions are selected by button name: trash(delete) or edit
    cy.do(
      MultiColumnListRow({ content: including(cancelReasonName) })
        .find(MultiColumnListCell({ columnIndex: 4 }))
        .find(Button({ icon: action }))
        .click(),
    );
  },

  checkMessage: (message, calloutType = calloutTypes.success) => {
    InteractorsTools.checkCalloutMessage(message, calloutType);
    InteractorsTools.closeCalloutMessage();
  },

  verifyCancelReasonNameFailure(message) {
    cy.expect(cancelReasonField.has({ error: message }));
  },

  verifyListIsEmpty: () => {
    cy.expect(rootPane.find(HTML(including('The list contains no items'))).exists());
  },

  verifyReasonIsNotListed: (name) => {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },

  verifyReasonInTheList({ name, description = '', publicDescription = '', members, actions = [] }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 4 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 1, content: description })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 2, content: publicDescription })).exists(),
      row.find(MultiColumnListCell({ columnIndex: 3, content: members })).exists(),
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

  verifyNoReasonInTheList(name) {
    cy.expect(MultiColumnListRow({ content: including(name) }).absent());
  },

  choose() {
    ConsortiumManagerApp.chooseSecondMenuItem('Request cancellation reasons');
    [
      'Cancel reason',
      'Description (internal)',
      'Description (public)',
      'Member libraries',
      'Actions',
    ].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
