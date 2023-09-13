import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const textFieldData = {
  fieldLabel: `Test${randomFourDigitNumber()}`,
  helpText: `Testdata${randomFourDigitNumber()}`,
};
const testAreaData = {
  fieldLabel: `dataArea${randomFourDigitNumber()}`,
  helpText: `fillData${randomFourDigitNumber()}`,
};
const checkboxData = {
  fieldLabel: `CheckBox${randomFourDigitNumber()}`,
  helpText: `testdata${randomFourDigitNumber()}`,
};
const radioButtonData = {
  data: {
    fieldLabel: `RadioButton${randomFourDigitNumber()}`,
    helpText: `testData${randomFourDigitNumber()}`,
    label1: `Radio1${randomFourDigitNumber()}`,
    label2: `Radio2${randomFourDigitNumber()}`,
  },
};
const label2 = `select${randomFourDigitNumber()}`;
const singleSelectData = {
  data: {
    fieldLabel: `Single Select Dropdown${randomFourDigitNumber()}`,
    helpText: 'select One Data',
    label1: `Select${randomFourDigitNumber()}`,
    label2,
  },
};

describe.skip('Settings', () => {
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Delete test data', () => {
    cy.visit(TopMenu.customFieldsPath);
    CustomFields.editButton();
    CustomFields.deleteCustomField(`${textFieldData.fieldLabel} · Text field`);
    CustomFields.deleteCustomField(`${testAreaData.fieldLabel} · Text area`);
    CustomFields.deleteCustomField(`${checkboxData.fieldLabel} · Checkbox`);
    CustomFields.deleteCustomField(`${radioButtonData.data.fieldLabel} · Radio button set`);
    CustomFields.deleteCustomField(`${singleSelectData.data.fieldLabel} · Single select`);
    CustomFields.confirmDeletion();
    CustomFields.verifyDeletedCustomFields(`${textFieldData.fieldLabel} · Text field`);
    CustomFields.verifyDeletedCustomFields(`${testAreaData.fieldLabel} · Text area`);
    CustomFields.verifyDeletedCustomFields(`${checkboxData.fieldLabel} · Checkbox`);
    CustomFields.verifyDeletedCustomFields(`${radioButtonData.data.fieldLabel} · Radio button set`);
    CustomFields.verifyDeletedCustomFields(`${singleSelectData.data.fieldLabel} · Single select`);
  });

  it(
    'C15693 Create a text field custom field (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomTextField(textFieldData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifyTextField(textFieldData.fieldLabel);
    },
  );

  it(
    'C15694 Create a text area custom field and add help text (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomTextArea(testAreaData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifyTextArea(testAreaData.fieldLabel);
    },
  );

  it(
    'C15695 Create a checkbox custom field (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomCheckBox(checkboxData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifyCheckBox(checkboxData.fieldLabel);
    },
  );

  it(
    'C15696 Create a radio button custom field (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomRadioButton(radioButtonData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifyRadioButton(radioButtonData.data.fieldLabel);
    },
  );

  it(
    'C15697 Create a single select custom field (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.addCustomSingleSelect(singleSelectData);
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifySingleSelect(singleSelectData.data.fieldLabel, label2);
    },
  );

  it(
    'C15701 Change custom fields order (volaris)',
    { tags: [TestTypes.ideaLabsTests, DevTeams.ideaLabsTests] },
    () => {
      cy.visit(TopMenu.customFieldsPath);
      CustomFields.editButton();
      UsersSearchPane.dragAndDropCustomFields();
      cy.visit(TopMenu.usersPath);
      UsersSearchPane.searchByKeywords('testing');
      UsersSearchPane.selectFirstUser('Excel, Testing');
      UsersSearchPane.verifyDragItem();
    },
  );
});
