/* eslint-disable cypress/no-unnecessary-waiting */
import { including } from '@interactors/html';
import { Button, Form, TextField, Accordion } from '../../../../../interactors';

export default {
  save: () => {
    cy.wait(1500);
    cy.do(Button('Save as profile & Close').click());
  },

  markFieldForProtection: (field) => {
    cy.get('div[class^="mclRow--"]')
      .contains('div[class^="mclCell-"]', field)
      .then((elem) => {
        elem.parent()[0].querySelector('input[type="checkbox"]').click();
      });
  },

  fillInstanceStatusTerm: (status) => {
    cy.do(TextField('Instance status term').fillIn(status));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillFundDistriction: (fundData) => {
    cy.do([
      TextField('Fund ID').fillIn(fundData.fundId),
      TextField('Expense class').fillIn(fundData.expenseClass),
    ]);
    // wait will be add uuid for acceptedValues
    cy.wait(1000);
    cy.do([
      TextField('Value').fillIn(`"${fundData.value}"`),
      Accordion('Fund distribution').find(Button('%')).click(),
    ]);
  },

  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),
};
