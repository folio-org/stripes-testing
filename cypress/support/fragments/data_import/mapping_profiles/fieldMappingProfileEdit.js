/* eslint-disable cypress/no-unnecessary-waiting */
import { including } from '@interactors/html';
import { Button, Form, TextField, Accordion, Option, Select } from '../../../../../interactors';

const recordTypeselect = Select({ name: 'profile.existingRecordType' });

export default {
  save: () => {
    cy.wait(1500);
    cy.do(Button('Save as profile & Close').click());
  },

  markFieldForProtection: (field) => {
    cy.get('div[class^="mclRow--"]')
      .find('div[class^="mclCell-"]')
      .contains(field)
      .then((elem) => {
        elem.parent()[0].querySelector('input[type="checkbox"]').click();
      });
  },

  fillInstanceStatusTerm: (status) => {
    cy.do(TextField('Instance status term').fillIn(status));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },

  fillCatalogedDate: (date) => {
    cy.do(TextField('Cataloged date').fillIn(date));
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

  verifyFOLIORecordTypeOptionExists(type) {
    cy.expect(recordTypeselect.find(Option(type)).exists());
  },
};
