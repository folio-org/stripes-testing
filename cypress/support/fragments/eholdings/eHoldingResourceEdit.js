import { TextField, Button, RadioButton, FieldList } from '../../../../interactors';

const addNewRange = () => {
  cy.do(Button('Add date range').click());
};

const customCoveredDatesRadioButton = RadioButton('Custom coverage dates (enter multiple date ranges in descending order)');

export default {
  // TODO: redesign to interactors after clarification of differences between edit and view pages
  waitLoading:() => {
    cy.get('div[id=eholdings-module-display]>form section[class*=pane][aria-labelledby*=details-view-pane-title]').should('be.visible');
  },

  addNewRange,

  setCustomCoverageDates: (range, rangeNumber = 0) => {
    if (rangeNumber > 0) {
      addNewRange();
    }
    cy.do(TextField('Start date', { id: `begin-coverage-${rangeNumber}` }).fillIn(range.startDay));
    cy.do(TextField('End date', { id: `end-coverage-${rangeNumber}` }).fillIn(range.endDay));
  },
  saveAndClose:() => {
    cy.do(Button('Save & close').click());
  },
  swicthToCustomCoverageDates:() => {
    cy.do(customCoveredDatesRadioButton.click());
  },
  removeExistingCustomeCoverageDates:(rangeCount) => {
    let deletedRowsCount = 0;

    while (deletedRowsCount !== rangeCount) {
      cy.do(customCoveredDatesRadioButton.find(FieldList()).clickRemove(0));
      deletedRowsCount++;
      cy.expect(customCoveredDatesRadioButton.find(FieldList()).has({ itemsCount: rangeCount - deletedRowsCount }));
    }
  }
};
