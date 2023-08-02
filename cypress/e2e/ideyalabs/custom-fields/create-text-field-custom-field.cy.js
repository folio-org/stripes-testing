import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import CustomFields from '../../../support/fragments/settings/users/customFields';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { getFourDigitRandomNumber } from '../../../support/utils/stringTools';

const textFieldData = {
  fieldLabel: `Test${getFourDigitRandomNumber()}`,
  helpText: `Testdata${getFourDigitRandomNumber()}`,
};
const testAreaData = {
  fieldLabel: `dataArea${getFourDigitRandomNumber()}`,
  helpText: `fillData${getFourDigitRandomNumber()}`,
};
const checkboxData = {
  fieldLabel: `CheckBox${getFourDigitRandomNumber()}`,
  helpText: `testdata${getFourDigitRandomNumber()}`,
};
const radioButtonData = {
  data: {
    fieldLabel: `RadioButton${getFourDigitRandomNumber()}`,
    helpText: `testData${getFourDigitRandomNumber()}`,
    label1: `Radio1${getFourDigitRandomNumber()}`,
    label2: `Radio2${getFourDigitRandomNumber()}`,
  },
};
const label2 = `select${getFourDigitRandomNumber()}`;
const singleSelectData = {
  data: {
    fieldLabel: `Single Select Dropdown${getFourDigitRandomNumber()}`,
    helpText: 'select One Data',
    label1: `Select${getFourDigitRandomNumber()}`,
    label2,
  },
};

describe('Settings', () => {
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  );
});
