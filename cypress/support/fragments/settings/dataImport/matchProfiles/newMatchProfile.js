/* eslint-disable cypress/no-unnecessary-waiting */
import { not } from 'bigtest';
import { HTML, including } from '@interactors/html';
import {
  Button,
  Select,
  TextField,
  SelectionList,
  Accordion,
  SelectionOption,
  Dropdown,
  Callout,
  Section,
  DropdownMenu,
  Pane,
  TextArea,
} from '../../../../../../interactors';
import { EXISTING_RECORDS_NAMES } from '../../../../constants';

const criterionValueTypeList = SelectionList({ id: 'sl-container-criterion-value-type' });
const criterionValueTypeButton = Button({ id: 'criterion-value-type' });
const matchProfileDetailsAccordion = Accordion({ id: 'match-profile-details' });
const recordSelectorDropdown = Dropdown({ id: 'record-selector-dropdown' });
const matchProfileDetailsSection = Section({ id: 'match-profile-details' });
const matchCriterionSelect = Select('Match criterion');
const nameTextField = TextField('Name*');
const closeButton = Button('Close');

const optionsList = {
  instanceHrid: 'Admin data: Instance HRID',
  holdingsHrid: 'Admin data: Holdings HRID',
  itemHrid: 'Admin data: Item HRID',
  pol: 'Acquisitions data: Purchase order line (POL)',
  uri: 'Electronic access: URI',
  instanceUuid: 'Admin data: Instance UUID',
  holdingsPermLoc: 'Location: Permanent',
  itemPermLoc: 'Location: Permanent',
  systemControlNumber: 'Identifier: System control number',
  status: 'Loan and availability: Status',
  barcode: 'Admin data: Barcode',
  instanceStatusTerm: 'Admin data: Instance status term',
  holdingsType: 'Admin data: Holdings type',
  identifierOCLC: 'Identifier: OCLC',
};

function fillExistingRecordFields(value = '', selector) {
  const map = {
    field: 'profile.matchDetails[0].existingMatchExpression.fields[0].value',
    in1: 'profile.matchDetails[0].existingMatchExpression.fields[1].value',
    in2: 'profile.matchDetails[0].existingMatchExpression.fields[2].value',
    subfield: 'profile.matchDetails[0].existingMatchExpression.fields[3].value',
  };
  cy.do(TextField({ name: map[selector] }).fillIn(value));
}

function fillIncomingRecordFields(value = '', selector) {
  const map = {
    field: 'profile.matchDetails[0].incomingMatchExpression.fields[0].value',
    in1: 'profile.matchDetails[0].incomingMatchExpression.fields[1].value',
    in2: 'profile.matchDetails[0].incomingMatchExpression.fields[2].value',
    subfield: 'profile.matchDetails[0].incomingMatchExpression.fields[3].value',
  };
  cy.do(TextField({ name: map[selector] }).fillIn(value));
}

function fillIncomingRecordSections({ incomingRecordFields }) {
  fillIncomingRecordFields(incomingRecordFields.field, 'field');
  fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
  fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
  fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
}

function fillExistingRecordSections({ existingRecordFields }) {
  fillExistingRecordFields(existingRecordFields.field, 'field');
  fillExistingRecordFields(existingRecordFields.in1, 'in1');
  fillExistingRecordFields(existingRecordFields.in2, 'in2');
  fillExistingRecordFields(existingRecordFields.subfield, 'subfield');
}

function fillName(profileName) {
  cy.do(nameTextField.fillIn(profileName));
  // wait for data to be loaded
  cy.wait(10000);
}

function selectExistingRecordType(existingRecordType) {
  cy.do(matchProfileDetailsAccordion.find(Button({ dataId: existingRecordType })).click());
}

function selectIncomingRecordType(incomingRecordType) {
  cy.do(matchProfileDetailsAccordion.find(recordSelectorDropdown).choose(incomingRecordType));
}

function fillQualifierInIncomingPart(qualifierType, qualifierValue) {
  cy.contains('Incoming MARC Bibliographic record').then((elem) => {
    elem.parent()[0].querySelectorAll('input[type="checkbox"]')[0].click();
  });
  cy.do([
    Select({
      name: 'profile.matchDetails[0].incomingMatchExpression.qualifier.qualifierType',
    }).choose(qualifierType),
    TextField({
      name: 'profile.matchDetails[0].incomingMatchExpression.qualifier.qualifierValue',
    }).fillIn(qualifierValue),
  ]);
}

function fillQualifierInExistingComparisonPart(compareValueInComparison) {
  cy.contains('Existing Instance record').then((elem) => {
    elem.parent()[0].querySelectorAll('input[type="checkbox"]')[1].click();
  });
  cy.do(
    Select({
      name: 'profile.matchDetails[0].existingMatchExpression.qualifier.comparisonPart',
    }).choose(compareValueInComparison),
  );
}

function fillQualifierInExistingPart(qualifierType, qualifierValue) {
  cy.contains('Existing MARC Bibliographic record').then((elem) => {
    elem.parent()[0].querySelector('input[type="checkbox').click();
  });
  cy.do([
    Select({
      name: 'profile.matchDetails[0].existingMatchExpression.qualifier.qualifierType',
    }).choose(qualifierType),
    TextField({
      name: 'profile.matchDetails[0].existingMatchExpression.qualifier.qualifierValue',
    }).fillIn(qualifierValue),
  ]);
}

function fillStaticValue(staticValue, recordValue) {
  cy.do([
    Dropdown({ id: 'record-selector-dropdown' }).open(),
    Button('Static value (submatch only)').click(),
    Select({
      name: 'profile.matchDetails[0].incomingMatchExpression.staticValueDetails.staticValueType',
    }).choose(recordValue),
  ]);
  if (recordValue === 'Text') {
    cy.do(
      TextField({
        name: 'profile.matchDetails[0].incomingMatchExpression.staticValueDetails.text',
      }).fillIn(staticValue),
    );
  }
  if (recordValue === 'Number') {
    cy.do(
      TextField({
        name: 'profile.matchDetails[0].incomingMatchExpression.staticValueDetails.number',
      }).fillIn(staticValue),
    );
  }
  if (recordValue === 'Date') {
    cy.do(
      TextField({
        name: 'profile.matchDetails[0].incomingMatchExpression.staticValueDetails.exactDate',
      }).fillIn(staticValue),
    );
  }
  if (recordValue === 'Date range') {
    cy.do([
      TextField({
        name: 'profile.matchDetails[0].incomingMatchExpression.staticValueDetails.fromDate',
      }).fillIn(staticValue),
      TextField({
        name: 'profile.matchDetails[0].incomingMatchExpression.staticValueDetails.toDate',
      }).fillIn(staticValue),
    ]);
  }
}

function selectMatchCriterion(matchCriterion) {
  cy.do(matchCriterionSelect.choose(matchCriterion));
}

function selectExistingRecordField(existingRecordOption) {
  cy.do(criterionValueTypeButton.click());
  cy.expect(criterionValueTypeList.exists());
  // TODO wait for list will be loaded
  cy.wait(1000);
  cy.do(criterionValueTypeList.find(SelectionOption(existingRecordOption)).click());
  // TODO wait until option will be selected
  cy.wait(1500);
  cy.get('#selected-criterion-value-type-item').contains(existingRecordOption);
}

function fillOnlyComparePartOfTheValue(value) {
  cy.contains('Incoming MARC Bibliographic record').then((elem) => {
    elem.parent()[0].querySelectorAll('input[type="checkbox"]')[1].click();
  });
  cy.do(
    Select({
      name: 'profile.matchDetails[0].incomingMatchExpression.qualifier.comparisonPart',
    }).choose(value),
  );
}

export default {
  optionsList,
  fillName,
  selectExistingRecordType,
  selectMatchCriterion,
  fillQualifierInIncomingPart,
  fillQualifierInExistingPart,
  selectExistingRecordField,
  fillStaticValue,
  fillOnlyComparePartOfTheValue,
  fillQualifierInExistingComparisonPart,
  fillIncomingRecordSections,
  fillExistingRecordSections,

  saveAndClose: () => cy.do(Button('Save as profile & Close').click()),

  fillMatchProfileForm: ({
    profileName,
    incomingRecordFields,
    existingRecordFields,
    matchCriterion,
    existingRecordType,
    instanceOption,
    holdingsOption,
    itemOption,
  }) => {
    fillName(profileName);
    // select existing record type
    if (existingRecordType === 'MARC_BIBLIOGRAPHIC') {
      selectExistingRecordType(existingRecordType);
      fillIncomingRecordFields(incomingRecordFields.field, 'field');
      fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
      fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
      fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
      selectMatchCriterion(matchCriterion);
      fillExistingRecordFields(existingRecordFields.field, 'field');
      fillExistingRecordFields(existingRecordFields.in1, 'in1');
      fillExistingRecordFields(existingRecordFields.in2, 'in2');
      fillExistingRecordFields(existingRecordFields.subfield, 'subfield');
    } else if (existingRecordType === 'INSTANCE') {
      // wait for list with data to be loaded
      cy.wait(1500);
      selectExistingRecordType(existingRecordType);
      fillIncomingRecordFields(incomingRecordFields.field, 'field');
      if (incomingRecordFields.in1) {
        fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
      }
      fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
      cy.do(criterionValueTypeButton.click());
      cy.expect(criterionValueTypeList.exists());
      cy.do(criterionValueTypeList.find(SelectionOption(instanceOption)).click());
      // TODO need to wait until profile will be filled
      cy.wait(1500);
    } else if (existingRecordType === 'MARC_AUTHORITY') {
      selectExistingRecordType(existingRecordType);
      selectIncomingRecordType('MARC Authority');
      fillIncomingRecordFields(incomingRecordFields.field, 'field');
      fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
      fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
      fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
      selectMatchCriterion(matchCriterion);
      fillExistingRecordFields(existingRecordFields.field, 'field');
      fillExistingRecordFields(existingRecordFields.in1, 'in1');
      fillExistingRecordFields(existingRecordFields.in2, 'in2');
      fillExistingRecordFields(existingRecordFields.subfield, 'subfield');
    } else if (existingRecordType === 'HOLDINGS') {
      // wait for list with data to be loaded
      cy.wait(1500);
      cy.do(matchProfileDetailsAccordion.find(Button({ dataId: 'HOLDINGS' })).click());
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
      cy.do(criterionValueTypeList.find(SelectionOption(holdingsOption)).click());
      // TODO need to wait until profile will be filled
      cy.wait(1500);
    } else {
      cy.do(matchProfileDetailsAccordion.find(Button({ dataId: 'ITEM' })).click());
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
      cy.do(criterionValueTypeList.find(SelectionOption(itemOption)).click());
      // TODO need to wait until profile will be filled
      cy.wait(1500);
    }
  },

  fillMatchProfileWithExistingPart: ({
    profileName,
    existingRecordType,
    incomingRecordFields,
    matchCriterion,
    existingRecordOption,
  }) => {
    fillName(profileName);
    selectExistingRecordType(existingRecordType);
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
    fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    selectMatchCriterion(matchCriterion);
    selectExistingRecordField(existingRecordOption);
  },

  fillMatchProfileWithStaticValue({
    profileName,
    incomingStaticValue,
    matchCriterion,
    existingRecordOption,
    existingRecordType,
    incomingStaticRecordValue,
  }) {
    fillName(profileName);
    selectExistingRecordType(existingRecordType);
    fillStaticValue(incomingStaticValue, incomingStaticRecordValue);
    selectMatchCriterion(matchCriterion);
    selectExistingRecordField(existingRecordOption);
  },

  fillMatchProfileWithStaticValueAndComparePartValue({
    profileName,
    incomingRecordFields,
    matchCriterion,
    existingRecordOption,
    existingRecordType,
    compareValue,
    qualifierType,
    qualifierValue,
    compareValueInComparison,
  }) {
    fillName(profileName);
    selectExistingRecordType(existingRecordType);
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
    fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    cy.wait(2000);
    fillQualifierInIncomingPart(qualifierType, qualifierValue);
    fillOnlyComparePartOfTheValue(compareValue);
    selectMatchCriterion(matchCriterion);
    selectExistingRecordField(existingRecordOption);
    fillQualifierInExistingComparisonPart(compareValueInComparison);
  },

  fillMatchProfileWithQualifierInIncomingAndExistingRecords({
    profileName,
    existingRecordType,
    incomingRecordFields,
    existingRecordFields,
    matchCriterion,
    qualifierType,
    qualifierValue,
  }) {
    fillName(profileName);
    selectExistingRecordType(existingRecordType);
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    fillQualifierInIncomingPart(qualifierType, qualifierValue);
    selectMatchCriterion(matchCriterion);
    fillExistingRecordFields(existingRecordFields.field, 'field');
    fillExistingRecordFields(existingRecordFields.subfield, 'subfield');
    fillQualifierInExistingPart(qualifierType, qualifierValue);
  },

  fillMatchProfileWithQualifierInIncomingRecordsAndValueInExistingRecord({
    profileName,
    existingRecordType,
    incomingRecordFields,
    existingRecordOption,
    matchCriterion,
    qualifierType,
    qualifierValue,
  }) {
    fillName(profileName);
    selectExistingRecordType(existingRecordType);
    fillIncomingRecordFields(incomingRecordFields.field, 'field');
    fillIncomingRecordFields(incomingRecordFields.in1, 'in1');
    fillIncomingRecordFields(incomingRecordFields.in2, 'in2');
    fillIncomingRecordFields(incomingRecordFields.subfield, 'subfield');
    fillQualifierInIncomingPart(qualifierType, qualifierValue);
    selectMatchCriterion(matchCriterion);
    // wait for list will be loaded
    cy.wait(2000);
    selectExistingRecordField(existingRecordOption);
  },

  createMatchProfileViaApi: (nameProfile) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/matchProfiles',
        body: {
          profile: {
            incomingRecordType: 'MARC_BIBLIOGRAPHIC',
            matchDetails: [
              {
                incomingRecordType: 'MARC_BIBLIOGRAPHIC',
                incomingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: '001',
                    },
                    { label: 'indicator1', value: '' },
                    { label: 'indicator2', value: '' },
                    { label: 'recordSubfield', value: '' },
                  ],
                  staticValueDetails: null,
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
                existingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: 'instance.hrid',
                    },
                  ],
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                matchCriterion: 'EXACTLY_MATCHES',
              },
            ],
            name: nameProfile,
            existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createMatchProfileWithIncomingAndExistingRecordsViaApi: ({
    profileName,
    incomingRecordFields,
    existingRecordFields,
    recordType,
  }) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/matchProfiles',
        body: {
          profile: {
            name: profileName,
            description: '',
            incomingRecordType: recordType,
            matchDetails: [
              {
                incomingRecordType: recordType,
                incomingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: incomingRecordFields.field,
                    },
                    {
                      label: 'indicator1',
                      value: incomingRecordFields.in1,
                    },
                    {
                      label: 'indicator2',
                      value: incomingRecordFields.in2,
                    },
                    {
                      label: 'recordSubfield',
                      value: incomingRecordFields.subfield,
                    },
                  ],
                  staticValueDetails: null,
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                existingRecordType: recordType,
                existingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: existingRecordFields.field,
                    },
                    {
                      label: 'indicator1',
                      value: existingRecordFields.in1,
                    },
                    { label: 'indicator2', value: existingRecordFields.in2 },
                    {
                      label: 'recordSubfield',
                      value: existingRecordFields.subfield,
                    },
                  ],
                  staticValueDetails: null,
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                matchCriterion: 'EXACTLY_MATCHES',
              },
            ],
            existingRecordType: recordType,
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createMatchProfileWithIncomingAndExistingMatchExpressionViaApi: ({
    profileName,
    incomingRecordFields,
    existingRecordType,
    existingMatchExpressionValue,
    recordType,
  }) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/matchProfiles',
        body: {
          profile: {
            name: profileName,
            description: '',
            incomingRecordType: recordType,
            matchDetails: [
              {
                incomingRecordType: recordType,
                incomingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: incomingRecordFields.field,
                    },
                    {
                      label: 'indicator1',
                      value: incomingRecordFields.in1,
                    },
                    {
                      label: 'indicator2',
                      value: incomingRecordFields.in2,
                    },
                    {
                      label: 'recordSubfield',
                      value: incomingRecordFields.subfield,
                    },
                  ],
                  staticValueDetails: null,
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                existingRecordType,
                existingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: existingMatchExpressionValue,
                    },
                  ],
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                matchCriterion: 'EXACTLY_MATCHES',
              },
            ],
            existingRecordType,
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  createMatchProfileViaApiMarc: ({
    profileName,
    incomingRecordFields,
    existingRecordFields,
    recordType,
  }) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'data-import-profiles/matchProfiles',
        body: {
          profile: {
            incomingRecordType: recordType,
            matchDetails: [
              {
                incomingRecordType: recordType,
                incomingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: incomingRecordFields.field,
                    },
                    {
                      label: 'indicator1',
                      value: incomingRecordFields.in1,
                    },
                    {
                      label: 'indicator2',
                      value: incomingRecordFields.in2,
                    },
                    {
                      label: 'recordSubfield',
                      value: incomingRecordFields.subfield,
                    },
                  ],
                  staticValueDetails: null,
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                existingRecordType: recordType,
                existingMatchExpression: {
                  fields: [
                    {
                      label: 'field',
                      value: existingRecordFields.field,
                    },
                    {
                      label: 'indicator1',
                      value: existingRecordFields.in1,
                    },
                    {
                      label: 'indicator2',
                      value: existingRecordFields.in2,
                    },
                    {
                      label: 'recordSubfield',
                      value: existingRecordFields.subfield,
                    },
                  ],
                  staticValueDetails: null,
                  dataValueType: 'VALUE_FROM_RECORD',
                },
                matchCriterion: 'EXACTLY_MATCHES',
              },
            ],
            name: profileName,
            existingRecordType: recordType,
          },
          addedRelations: [],
          deletedRelations: [],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },

  checkCalloutMessage: (message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
  },

  verifyExistingRecordSection: () => {
    cy.expect([
      matchProfileDetailsSection
        .find(
          HTML(
            including(
              'Which type of existing record would you like to compare to the incoming MARC record?',
            ),
          ),
        )
        .exists(),
      cy.get('#panel-existing-edit [data-id=INSTANCE]').should('exist'),
      cy.get('#panel-existing-edit [data-id=HOLDINGS]').should('exist'),
      cy.get('#panel-existing-edit [data-id=ITEM]').should('exist'),
      cy.get('#panel-existing-edit [data-id=MARC_BIBLIOGRAPHIC]').should('exist'),
      cy.get('#panel-existing-edit [data-id=MARC_AUTHORITY]').should('exist'),
    ]);
  },
  clickOnExistingRecordByName: (name) => {
    cy.do(matchProfileDetailsAccordion.find(Button({ text: name })).click());
  },
  verifyExistingRecordTypeIsSelected: (existingRecordType) => {
    cy.get(`[data-test-compare-record=${existingRecordType}]`).should(
      'contain',
      'You are comparing\nto this record',
    );
  },
  verifyMatchCriterionNotContains: (value) => {
    cy.expect(matchCriterionSelect.has({ value: not(value) }));
    cy.get('#match-criteria').should(($element) => {
      const content = $element.text();
      expect(content).to.not.include(value);
    });
  },
  verifyIncomingRecordsDropdown: (...names) => {
    cy.do(Dropdown({ id: 'record-selector-dropdown' }).toggle());
    names.forEach((name) => {
      cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).exists()]);
    });
  },
  verifyIncomingRecordsItemDoesNotExist(name) {
    cy.expect([DropdownMenu({ visible: true }).find(HTML(name)).absent()]);
    cy.do(Dropdown({ id: 'record-selector-dropdown' }).toggle());
  },
  verifyNewMatchProfileFormIsOpened: () => {
    cy.expect(Pane('New match profile').exists());
  },
  verifyPreviouslyPopulatedDataIsDisplayed: (profile, recordType) => {
    cy.get(`[data-id="${profile.existingRecordType}"]`).should('contain', recordType);
    cy.expect([
      nameTextField.has({ value: profile.name }),
      TextArea('Description').has({ value: profile.description }),
      TextField({ name: 'profile.matchDetails[0].incomingMatchExpression.fields[0].value' }).has({
        value: profile.incomingRecordFields.field,
      }),
      TextField({ name: 'profile.matchDetails[0].existingMatchExpression.fields[0].value' }).has({
        value: profile.existingRecordFields.field,
      }),
    ]);
  },
  clickClose: () => cy.do(closeButton.click()),
};
