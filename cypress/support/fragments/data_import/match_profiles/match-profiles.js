import { Button, Modal, MultiColumnListCell, Select, TextField } from '../../../../../interactors';
import SettingsDataImport from '../settingsDataImport';

const openNewMatchProfileForm = () => {
  cy.do([
    Button('Actions').click(),
    Button('New match profile').click()
  ]);
};

const fillExistingRecordFields = ({ field, in1, in2, subfield }) => {
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[0].value"]').type(field);
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[1].value"]').type(in1);
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[2].value"]').type(in2);
  cy.get('[name="profile.matchDetails[0].existingMatchExpression.fields[3].value"]').type(subfield);
};

const fillIncomingRecordFields = ({ field, in1, in2, subfield }) => {
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[0].value"]').type(field);
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[1].value"]').type(in1);
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[2].value"]').type(in2);
  cy.get('[name="profile.matchDetails[0].incomingMatchExpression.fields[3].value"]').type(subfield);
};

const fillMatchProfileForm = ({
  profileName,
  incomingRecordFields,
  existingRecordFields,
  matchCriterion
}) => {
  cy.do(TextField('Name*').fillIn(profileName));
  // select existing record type
  cy.get('[data-id="MARC_BIBLIOGRAPHIC"]').click();
  // fill MARC Bibliographic field in incoming
  fillIncomingRecordFields(incomingRecordFields);
  // choose match criterion
  cy.do(Select('Match criterion').choose(matchCriterion));
  // fill MARC Bibliographic field in existing
  fillExistingRecordFields(existingRecordFields);
};

const deleteMatchProfile = (profileName) => {
  SettingsDataImport.goToMatchProfile();
  cy.do(MultiColumnListCell(profileName).click());
  cy.get('[data-pane-header-actions-dropdown]')
    .should('have.length', 2)
    .eq(1)
    .click();
  cy.do([
    Button('Delete').click(),
    Modal(`Delete "${profileName}" match profile?`).find(Button('Delete')).click(),
  ]);

  cy.expect(MultiColumnListCell(profileName).absent());
};

export default {
  openNewMatchProfileForm,
  fillIncomingRecordFields,
  fillExistingRecordFields,
  deleteMatchProfile,
  createMatchProfile(profile) {
    openNewMatchProfileForm();
    fillMatchProfileForm(profile);
    // save profile
    cy.do(Button('Save as profile & Close').click());
    // wait till profile appears in profiles list
    cy.expect(MultiColumnListCell(profile.profileName).exists());
  },
};
