import {
  Button,
  Pane,
  PaneContent,
  NavListItem,
  MultiColumnListRow,
  including,
} from '../../../../../../interactors';
import { CallNumberTypes } from './callNumberTypes';

const sectionName = 'Call number browse';
export const callNumbersIds = {
  'Call numbers (all)': 'all',
  'Library of Congress classification': 'lc',
  'Dewey Decimal classification': 'dewey',
  'National Library of Medicine classification': 'nlm',
  'Other scheme': 'other',
  'Superintendent of Documents classification': 'sudoc',
};

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

const API = {
  updateCallNumberBrowse({ callNumberBrowseId, callNumberTypes, shelvingAlgorithm }) {
    return cy.okapiRequest({
      path: `browse/config/instance-call-number/${callNumberBrowseId}`,
      method: 'PUT',
      body: {
        id: callNumberBrowseId,
        shelvingAlgorithm,
        typeIds: callNumberTypes,
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  getCallNumberBrowseConfigViaAPI() {
    return cy.okapiRequest({ path: 'browse/config/instance-call-number' });
  },

  assignCallNumberTypesViaApi({ name, callNumberTypes }) {
    this.getCallNumberBrowseConfigViaAPI().then((resp) => {
      const shelvingAlgorithm = resp.body.configs.filter(
        (config) => config.id === callNumbersIds[name],
      )[0].shelvingAlgorithm;
      CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
        const typeIds = types
          .filter((type) => callNumberTypes.includes(type.name))
          .map((type) => type.id);
        return this.updateCallNumberBrowse({
          callNumberBrowseId: callNumbersIds[name],
          callNumberTypes: typeIds,
          shelvingAlgorithm,
        });
      });
    });
  },
};

export const CallNumberBrowseSettings = {
  ...Actions,
  ...Assertions,
  ...API,
};
