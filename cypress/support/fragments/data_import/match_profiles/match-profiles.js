import { Button, MultiColumnListCell, Select, TextField } from '../../../../../interactors';

const openNewMatchProfileForm = () => {
  cy.do([
    Button('Actions').click(),
    Button('New match profile').click()
  ]);
};

const fillExistingRecordFields = (field = '999', in1 = 'f', in2 = 'f', subfield = 's') => {
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[0].value"]').type(field);
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[1].value"]').type(in1);
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[2].value"]').type(in2);
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[3].value"]').type(subfield);
};

const fillIncomingRecordFields = (field = '999', in1 = 'f', in2 = 'f', subfield = 's') => {
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[0].value"]').type(field);
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[1].value"]').type(in1);
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[2].value"]').type(in2);
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[3].value"]').type(subfield);
};

const fillMatchProfileForm = (profileName) => {
  cy.do(TextField('Name*').fillIn(profileName));
  // select existing record type
  cy.get('[data-id="MARC_BIBLIOGRAPHIC"]').click();
  // fill MARC Bibliographic field in incoming
  fillIncomingRecordFields();
  // choose match criterion
  cy.do(Select('Match criterion').choose('Exactly matches'));
  // fill MARC Bibliographic field in existing
  fillExistingRecordFields();
};


export default {
  openNewMatchProfileForm,
  fillIncomingRecordFields,
  fillExistingRecordFields,
  createMatchProfile(profileName) {
    openNewMatchProfileForm();
    fillMatchProfileForm(profileName);
    // save profile
    cy.do(Button('Save as profile & Close').click());
    // wait till profile appears in profiles list
    cy.expect(MultiColumnListCell(profileName).exists());
  },
};
