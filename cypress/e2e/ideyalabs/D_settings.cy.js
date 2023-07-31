import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import agreementsDetails from '../../support/fragments/agreements/agreementsDetails';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import existingNoteEdit from '../../support/fragments/notes/existingNoteEdit';
import existingNoteView from '../../support/fragments/notes/existingNoteView';
import newNote from '../../support/fragments/notes/newNote';
import organizations from '../../support/fragments/organizations/organizations';
import customFields from '../../support/fragments/settings/users/customFields';
import settingsMenu from '../../support/fragments/settingsMenu';
import topMenu from '../../support/fragments/topMenu';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getFourDigitRandomNumber } from '../../support/utils/stringTools';

const textFieldData = { fieldLabel: `Test${getFourDigitRandomNumber()}`, helpText: `Testdata${getFourDigitRandomNumber()}` };
const testAreaData = { fieldLabel: `dataArea${getFourDigitRandomNumber()}`, helpText: `fillData${getFourDigitRandomNumber()}` };
const checkboxData = { fieldLabel: `CheckBox${getFourDigitRandomNumber()}`, helpText: `testdata${getFourDigitRandomNumber()}` };
const radioButtonData = { data: { fieldLabel: `RadioButton${getFourDigitRandomNumber()}`, helpText: `testData${getFourDigitRandomNumber()}`, label1: `Radio1${getFourDigitRandomNumber()}`, label2: `Radio2${getFourDigitRandomNumber()}` } };
const label2 = `select${getFourDigitRandomNumber()}`;
const singleSelectData = { data: { fieldLabel: `Single Select Dropdown${getFourDigitRandomNumber()}`, helpText: 'select One Data', label1: `Select${getFourDigitRandomNumber()}`, label2 } };
const noteData = `New Note${getFourDigitRandomNumber()}`;
const testData = {
  name: `Administrator${getFourDigitRandomNumber()}`,
  description: `Hello${getFourDigitRandomNumber()}`,
};
const noteType = `Item${getFourDigitRandomNumber()}`;
const categoryName = `Test${getFourDigitRandomNumber()}`;

describe('Settings', () => {
  before('Login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Delete test data', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.editButton();
    customFields.deleteCustomField(`${textFieldData.fieldLabel} · Text field`);
    customFields.deleteCustomField(`${testAreaData.fieldLabel} · Text area`);
    customFields.deleteCustomField(`${checkboxData.fieldLabel} · Checkbox`);
    customFields.deleteCustomField(`${radioButtonData.data.fieldLabel} · Radio button set`);
    customFields.deleteCustomField(`${singleSelectData.data.fieldLabel} · Single select`);
    customFields.confirmDeletion();
    customFields.verifyDeletedCustomFields(`${textFieldData.fieldLabel} · Text field`);
    customFields.verifyDeletedCustomFields(`${testAreaData.fieldLabel} · Text area`);
    customFields.verifyDeletedCustomFields(`${checkboxData.fieldLabel} · Checkbox`);
    customFields.verifyDeletedCustomFields(`${radioButtonData.data.fieldLabel} · Radio button set`);
    customFields.verifyDeletedCustomFields(`${singleSelectData.data.fieldLabel} · Single select`);
  });

  it('C15693 Create a text field custom field (volaris)', { tags: [testTypes.extendedPath, devTeams.volaris] }, () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomTextField(textFieldData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTextField(textFieldData.fieldLabel);
  });

  it('C15694 Create a text area custom field and add help text (volaris)', { tags: [testTypes.extendedPath, devTeams.volaris] }, () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomTextArea(testAreaData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTextArea(testAreaData.fieldLabel);
  });

  it('C15695 Create a checkbox custom field (volaris)', { tags: [testTypes.extendedPath, devTeams.volaris] }, () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomCheckBox(checkboxData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyCheckBox(checkboxData.fieldLabel);
  });

  it('C15696 Create a radio button custom field (volaris)', { tags: [testTypes.extendedPath, devTeams.volaris] }, () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomRadioButton(radioButtonData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyRadioButton(radioButtonData.data.fieldLabel);
  });

  it('C15697 Create a single select custom field (volaris)', { tags: [testTypes.extendedPath, devTeams.volaris] }, () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomSingleSelect(singleSelectData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifySingleSelect(singleSelectData.data.fieldLabel, label2);
  });

  it('C15701 Change custom fields order (volaris)', { tags: [testTypes.extendedPath, devTeams.volaris] }, () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.editButton();
    usersSearchPane.dragAndDropCustomFields();
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyDragItem();
  });

  it('C2234 Create new permission set (volaris)', { tags: [testTypes.criticalPath, devTeams.volaris] }, () => {
    cy.visit(topMenu.permissionSetPath);
    customFields.clickOnNewButton();
    customFields.createPermission(testData);
    customFields.deletePermission(testData);
  });

  it('C16985 Settings | Set up a note type (spitfire)', { tags: [testTypes.extendedPath, devTeams.spitfire] }, () => {
    cy.visit(topMenu.notesPath);
    newNote.fillNote(noteData);
    cy.visit(topMenu.agreementsPath);
    agreementsDetails.agreementListClick('2020 ACS Publications');
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    newNote.clickOnNoteType(noteData);
    newNote.deleteNote(noteData);
  });

  it('C1304 Settings | Edit a note type (spitfire)', { tags: [testTypes.extendedPath, devTeams.spitfire] }, () => {
    cy.visit(topMenu.notesPath);
    existingNoteEdit.clickEditButton(noteType);
    cy.visit(topMenu.agreementsPath);
    agreementsDetails.agreementListClick('2020 ACS Publications');
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    newNote.clickOnNoteType(noteType);
    agreementsDetails.clickCancelButton();
    newNote.closeWithoutSaveButton();
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNoteRecord();
    existingNoteView.gotoEdit();
    newNote.clickOnNoteType(noteType);
  });

  it('C731 Create new categories (thunderjet)', { tags: [testTypes.extendedPath, devTeams.thunderjet] }, () => {
    cy.visit(settingsMenu.organizationsPath);
    organizations.addNewCategory(categoryName);
    cy.visit(topMenu.organizationsPath);
    organizations.searchByParameters('All', 'organization');
    organizations.selectOrganization('New organization');
    organizations.editOrganization();
    organizations.verifyNewCategory(categoryName);
    cy.visit(settingsMenu.organizationCategoryPath);
    organizations.deleteCreatedCategory(categoryName);
  });

  it('C367970 Check that User can save changes while edit ""Fixed due date schedules"" without changing ""Fixed due date schedules name"" field (vega)', { tags: [testTypes.criticalPath, devTeams.vega] }, () => {
    cy.visit(settingsMenu.circulationFixedDueDateSchedulesPath);
    eHoldingsProviders.editSchedule({ data: { name: 'Magnus test', description: `Test${getFourDigitRandomNumber()}` } });
  });
});
