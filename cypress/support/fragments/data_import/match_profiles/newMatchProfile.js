import {
  Button,
  Select,
  TextField,
  SelectionList,
  Accordion,
  SelectionOption
} from '../../../../../interactors';

const criterionValueTypeList = SelectionList({ id: 'sl-container-criterion-value-type' });
const criterionValueTypeButton = Button({ id:'criterion-value-type' });
const optionsList = {
  instanceHrid: 'Admin data: Instance HRID',
  holdingsHrid: 'Admin data: Holdings HRID',
  itemHrid: 'Admin data: Item HRID',
  pol: 'Acquisitions data: Purchase order line (POL)',
  uri: 'Electronic access: URI',
};

function fillExistingRecordFields(value = '', selector) {
  const map = {
    field: 'profile.matchDetails[0].existingMatchExpression.fields[0].value',
    in1: 'profile.matchDetails[0].existingMatchExpression.fields[1].value',
    in2: 'profile.matchDetails[0].existingMatchExpression.fields[2].value',
    subfield: 'profile.matchDetails[0].existingMatchExpression.fields[3].value'
  };
  cy.do(TextField({ name: map[selector] }).fillIn(value));
}

function fillIncomingRecordFields(value = '', selector) {
  const map = {
    field: 'profile.matchDetails[0].incomingMatchExpression.fields[0].value',
    in1: 'profile.matchDetails[0].incomingMatchExpression.fields[1].value',
    in2: 'profile.matchDetails[0].incomingMatchExpression.fields[2].value',
    subfield: 'profile.matchDetails[0].incomingMatchExpression.fields[3].value'
  };
  cy.do(TextField({ name: map[selector] }).fillIn(value));
}

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
  cy.wait(1500);
  // select existing record type
  if (existingRecordType === 'MARC_BIBLIOGRAPHIC') {
    cy.do(Button({ dataId:'MARC_BIBLIOGRAPHIC' }).click());
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
    fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    cy.do(Select('Match criterion').choose(matchCriterion));
    fillExistingRecordFields(existingRecordFields.field, 'field');
    fillExistingRecordFields(existingRecordFields.in1, 'in1');
    fillExistingRecordFields(existingRecordFields.in2, 'in2');
    fillExistingRecordFields(existingRecordFields.subfield, 'subfield');
  } else if (existingRecordType === 'INSTANCE') {
    // wait for list with data to be loaded
    cy.wait(1500);
    cy.do(Accordion({ id:'match-profile-details' }).find(Button({ dataId:'INSTANCE' })).click());
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    if (incomingRecordFields.in1) {
      fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
    }
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    cy.do(criterionValueTypeButton.click());
    cy.expect(criterionValueTypeList.exists());
    cy.do(SelectionList({ id:'sl-container-criterion-value-type' }).find(SelectionOption(instanceOption)).click());
  } else if (existingRecordType === 'HOLDINGS') {
    cy.wait(1500);
    cy.do(Accordion({ id:'match-profile-details' }).find(Button({ dataId:'HOLDINGS' })).click());
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    if (incomingRecordFields.in1) {
      fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
    }
    if (incomingRecordFields.in2) {
      fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
    }
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    cy.do(criterionValueTypeButton.click());
    cy.expect(criterionValueTypeList.exists());
    cy.do(SelectionList({ id:'sl-container-criterion-value-type' }).find(SelectionOption(holdingsOption)).click());
  } else {
    cy.do(Accordion({ id:'match-profile-details' }).find(Button({ dataId:'ITEM' })).click());
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    cy.do(criterionValueTypeButton.click());
    cy.expect(criterionValueTypeList.exists());
    cy.do(SelectionList({ id:'sl-container-criterion-value-type' }).find(SelectionOption(itemOption)).click());
  }
};

export default {
  optionsList,
  fillMatchProfileForm
};
