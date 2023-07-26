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
import { randomFourDigitNumber } from '../../support/utils/stringTools';

describe('Creating Permissions Set and Custom Fields', () => {
  const textFieldData = { fieldLabel: `Test${randomFourDigitNumber()}`, helpText: `Testdata${randomFourDigitNumber()}` };
  const testAreaData = { fieldLabel: `dataArea${randomFourDigitNumber()}`, helpText: `fillData${randomFourDigitNumber()}` };
  const checkboxData = { fieldLabel: `CheckBox${randomFourDigitNumber()}`, helpText: `testdata${randomFourDigitNumber()}` };
  const radioButtonData = { data: { fieldLabel: `RadioButton${randomFourDigitNumber()}`, helpText: `testData${randomFourDigitNumber()}`, label1: `Radio1${randomFourDigitNumber()}`, label2: `Radio2${randomFourDigitNumber()}` } };
  const label2 = `select${randomFourDigitNumber()}`;
  const singleSelectData = { data: { fieldLabel: `Single Select Dropdown${randomFourDigitNumber()}`, helpText: 'select One Data', label1: `Select${randomFourDigitNumber()}`, label2 } };

  before('login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });
  it('C15693__Create a text field custom field', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomTextField(textFieldData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTestField(textFieldData.fieldLabel);
  });
  it('C15694__Create a text area custom field and add help text', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomTextArea(testAreaData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTestArea(testAreaData.fieldLabel);
  });
  it('C15695__Create a checkbox custom field', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomCheckBox(checkboxData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyCheckBox(checkboxData.fieldLabel);
  });
  it('C15696__Create a radio button custom field', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomRadioButton(radioButtonData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyRadioButton(radioButtonData.data.fieldLabel);
  });
  it('C15697__Create a single select custom field', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomSingleSelect(singleSelectData);
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifySingleSelect(singleSelectData.data.fieldLabel, label2);
  });
  it('C15701__Change custom fields order', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.editButton();
    usersSearchPane.dragAndDropCustomFields();
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyDragItem();
  });
  it('C2234__Create new permission set', () => {
    const testData = {
      name: `Administrator${randomFourDigitNumber()}`,
      description: `Hello${randomFourDigitNumber()}`,
    };
    cy.visit(topMenu.permissionSetPath);
    customFields.clickONewButton();
    customFields.createPermission(testData);
    customFields.deletePermission(testData);
  });
  it('C16985__Settings | Set up a note type', () => {
    const noteData = `New Note${randomFourDigitNumber()}`;
    cy.visit(topMenu.notesPath);
    newNote.clickOnNew(noteData);
    cy.visit(topMenu.agreementsPath);
    agreementsDetails.agreementListClick('2020 ACS Publications');
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    newNote.clickOnNoteType(noteData);
    newNote.deleteNote(noteData);
  });
  it('C1304__Settings | Edit a note type', () => {
    cy.visit(topMenu.notesPath);
    existingNoteEdit.clickEditButton(`Item${randomFourDigitNumber()}`);
    cy.visit(topMenu.agreementsPath);
    agreementsDetails.agreementListClick('2020 ACS Publications');
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    newNote.clickOnNoteType(`Item${randomFourDigitNumber()}`);
    agreementsDetails.clickCancelButton();
    newNote.closeWithoutSaveButton();
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNoteRecord();
    existingNoteView.gotoEdit();
    newNote.clickOnNoteType(`Item${randomFourDigitNumber()}`);
  });
  it('C731__Create new categories', () => {
    const categoryName = `Test${randomFourDigitNumber()}`;
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
  it('C367970-Check that User can save changes while edit ""Fixed due date schedules"" without changing ""Fixed due date schedules name"" field', () => {
    cy.visit(settingsMenu.circulationFixedDueDateSchedulesPath);
    eHoldingsProviders.editSchedule({ data: { name: 'Magnus test', description: `Test${randomFourDigitNumber()}` } });
  });
  after('delete the test data', () => {
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
});
