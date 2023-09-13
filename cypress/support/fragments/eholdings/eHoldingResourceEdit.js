import { TextField, Button, RadioButton, Accordion } from '../../../../interactors';

const addNewRange = () => {
  cy.do(Button('Add date range').click());
};
const saveAndClose = () => {
  cy.do(Button('Save & close').click());
};

const customCoveredDatesRadioButton = RadioButton(
  'Custom coverage dates (enter multiple date ranges in descending order)',
);

const customLabelsAccordion = Accordion('Custom labels');
const customLabelInput = (label) => customLabelsAccordion.find(TextField({ label }));

export default {
  // TODO: redesign to interactors after clarification of differences between edit and view pages
  waitLoading: () => {
    cy.get(
      'div[id=eholdings-module-display]>form section[class*=pane][aria-labelledby*=details-view-pane-title]',
    ).should('be.visible');
  },

  addNewRange,

  setCustomCoverageDates: (range, rangeNumber = 1) => {
    if (rangeNumber > 0) {
      addNewRange();
    }
    cy.do(TextField('Start date', { id: `begin-coverage-${rangeNumber}` }).fillIn(range.startDay));
    cy.do(TextField('End date', { id: `end-coverage-${rangeNumber}` }).fillIn(range.endDay));
  },
  saveAndClose,
  swicthToCustomCoverageDates: () => {
    cy.do(customCoveredDatesRadioButton.click());
  },
  removeExistingCustomeCoverageDates: () => {
    cy.do(RadioButton('Managed coverage dates').click());
    saveAndClose();
  },
  fillCustomLabelValue(labelName, value) {
    cy.do(customLabelInput(labelName).fillIn(value));
  },
};
