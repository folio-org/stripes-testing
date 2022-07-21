import {
  Button,
  Select,
  TextField,
  SelectionList,
  Accordion,
  SelectionOption
} from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';

const criterionValueTypeList = SelectionList({ id: 'sl-container-criterion-value-type' });
const criterionValueTypeButton = Button({ id:'criterion-value-type' });
const optionsList = {
  holdingsHrid: 'Admin data: Holdings HRID',
  itemHrid: 'Admin data: Item HRID',
  pol: 'Acquisitions data: Purchase order line (POL)'
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
  existingRecordType,
  instanceOption,
  holdingsOption,
  itemOption
}) => {
  cy.do(TextField('Name*').fillIn(profileName));
  // wait for data to be loaded
  cy.intercept('/_/jsonSchemas?path=raml-util/schemas/metadata.schema').as('getJson');
  cy.wait('@getJson', getLongDelay());
  // select existing record type
  if (existingRecordType === 'MARC_BIBLIOGRAPHIC') {
    cy.do(Button({ dataId:'MARC_BIBLIOGRAPHIC' }).click());
    fillIncomingRecordFields(incomingRecordFields);
    cy.do(Select('Match criterion').choose(matchCriterion));
    fillExistingRecordFields(existingRecordFields);
  } else if (existingRecordType === 'INSTANCE') {
    cy.intercept('/_/jsonSchemas?path=acq-models/mod-orders-storage/schemas/vendor_detail.json').as('getJson2');
    cy.wait('@getJson2', getLongDelay());
    cy.wait(1000);
    cy.do(Accordion({ id:'match-profile-details' }).find(Button({ dataId:'INSTANCE' })).click());
    fillIncomingRecordFields(incomingRecordFields);
    cy.do(criterionValueTypeButton.click());
    cy.expect(criterionValueTypeList.exists());
    cy.do(SelectionList({ id:'sl-container-criterion-value-type' }).find(SelectionOption(instanceOption)).click());
  } else if (existingRecordType === 'HOLDINGS') {
    cy.do(Accordion({ id:'match-profile-details' }).find(Button({ dataId:'HOLDINGS' })).click());
    fillIncomingRecordFields(incomingRecordFields);
    cy.do(criterionValueTypeButton.click());
    cy.expect(criterionValueTypeList.exists());
    cy.do(SelectionList({ id:'sl-container-criterion-value-type' }).find(SelectionOption(holdingsOption)).click());
  } else {
    cy.do(Accordion({ id:'match-profile-details' }).find(Button({ dataId:'ITEM' })).click());
    fillIncomingRecordFields(incomingRecordFields);
    cy.do(criterionValueTypeButton.click());
    cy.expect(criterionValueTypeList.exists());
    cy.do(SelectionList({ id:'sl-container-criterion-value-type' }).find(SelectionOption(itemOption)).click());
  }
};

export default {
  optionsList,
  fillIncomingRecordFields,
  fillExistingRecordFields,
  fillMatchProfileForm
};

