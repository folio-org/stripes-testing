import { Button, MultiColumnListCell, Select, TextField, SelectionList, Section } from '../../../../../interactors';

const openNewMatchProfileForm = () => {
  cy.do([
    Section({ id: 'pane-results' }).find(Button('Actions')).click(),
    Button('New match profile').click()
  ]);
};

const fillExistingRecordFields = ({ field, in1, in2, subfield }) => {
  if (field) {
    cy.do(TextField({ name: 'profile.matchDetails[0].existingMatchExpression.fields[0].value' }).fillIn(field));
  }
  if (in1) {
    cy.do(TextField({ name: 'profile.matchDetails[0].existingMatchExpression.fields[1].value' }).fillIn(in1));
  }
  if (in2) {
    cy.do(TextField({ name: 'profile.matchDetails[0].existingMatchExpression.fields[2].value' }).fillIn(in2));
  }
  if (subfield) {
    cy.do(TextField({ name: 'profile.matchDetails[0].existingMatchExpression.fields[3].value' }).fillIn(subfield));
  }
};

const fillIncomingRecordFields = ({ field, in1, in2, subfield }) => {
  if (field) {
    cy.do(TextField({ name: 'profile.matchDetails[0].incomingMatchExpression.fields[0].value' }).fillIn(field));
  }
  if (in1) {
    cy.do(TextField({ name: 'profile.matchDetails[0].incomingMatchExpression.fields[1].value' }).fillIn(in1));
  }
  if (in2) {
    cy.do(TextField({ name: 'profile.matchDetails[0].incomingMatchExpression.fields[2].value' }).fillIn(in2));
  }
  if (subfield) {
    cy.do(TextField({ name: 'profile.matchDetails[0].incomingMatchExpression.fields[3].value' }).fillIn(subfield));
  }
};

const fillMatchProfileForm = ({
  profileName,
  incomingRecordFields,
  existingRecordFields,
  matchCriterion,
  existingRecordType
}) => {
  cy.do(TextField('Name*').fillIn(profileName));
  // select existing record type
  // wait for data to be loaded
  cy.intercept(
    {
      method: 'GET',
      url: '/_/jsonSchemas?path=raml-util/schemas/metadata.schema',
    }
  ).as('getJson');
  cy.wait('@getJson');
  // TODO think about how to use interactor
  cy.get(`[data-id="${existingRecordType}"]`).last().click();
  // fill MARC Bibliographic field in incoming
  fillIncomingRecordFields(incomingRecordFields);
  // choose match criterion
  cy.do(Select('Match criterion').choose(matchCriterion));
  if (existingRecordType === 'MARC_BIBLIOGRAPHIC') {
    // fill MARC Bibliographic field in existing
    fillExistingRecordFields(existingRecordFields);
  } else if (existingRecordType === 'HOLDINGS') {
    cy.do(Button({ id:'criterion-value-type' }).click());
    cy.expect(SelectionList({ id: 'sl-container-criterion-value-type' }).exists());
    cy.do(SelectionList({ id: 'sl-container-criterion-value-type' }).select('Admin data: Holdings HRID'));
  } else {
    cy.do(Button({ id:'criterion-value-type' }).click());
    cy.expect(SelectionList({ id: 'sl-container-criterion-value-type' }).exists());
    cy.do(SelectionList({ id: 'sl-container-criterion-value-type' }).select('Admin data: Item HRID'));
  }
};

const deleteMatchProfile = (profileName) => {
  // get all match profiles
  cy
    .okapiRequest({
      path: 'data-import-profiles/matchProfiles',
      searchParams: {
        query: '(cql.allRecords=1) sortby name',
        limit: 30
      },
    })
    .then(({ body: { matchProfiles } }) => {
      // find profile to delete
      const profileToDelete = matchProfiles.find(profile => profile.name === profileName);

      // delete profile with its id
      cy
        .okapiRequest({
          method: 'DELETE',
          path: `data-import-profiles/matchProfiles/${profileToDelete.id}`,
        })
        .then(({ status }) => {
          if (status === 204) cy.log('###DELETED MATCH PROFILE###');
        });
    });
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
