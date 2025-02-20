import {
  Button,
  Pane,
  PaneContent,
  NavListItem,
  MultiColumnListRow,
  including,
} from '../../../../../../interactors';

const sectionName = 'Call number browse';

const elements = {
  sectionName: 'Call number browse',
  navigationPane: PaneContent({ id: 'app-settings-nav-pane-content' }),
  callNumberBrowsePane: Pane(sectionName),
  editButton: Button({ icon: 'edit' }),
  cancelButton: Button('Cancel'),
  saveButton: Button('Save'),

  getTargetRowByName(callNumberName) {
    return this.callNumberBrowsePane.find(
      MultiColumnListRow({ innerHTML: including(callNumberName), isContainer: true }),
    );
  },
};

const Actions = {
  openCallNumberBrowse() {
    cy.intercept('/browse/config/instance-call-number').as('callNumberTypes');
    cy.do(elements.navigationPane.find(NavListItem(sectionName)).click());
    cy.wait('@callNumberTypes', { timeout: 10_000 });
  },

  clickEditButtonForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.do(targetRow.find(elements.editButton).click());
  },
  clickSaveButtonForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.do(targetRow.find(elements.saveButton).click());
  },
};

const Assertions = {
  validateCallNumberBrowsePaneOpened() {
    cy.expect(elements.callNumberBrowsePane.exists());
  },
  validateSaveButtonIsDisabledForItem(optionName) {
    const targetRow = elements.getTargetRowByName(optionName);
    cy.expect(targetRow.find(elements.saveButton).isDisabled());
  },
};

export const CallNumberBrowse = {
  ...Actions,
  ...Assertions,
};
