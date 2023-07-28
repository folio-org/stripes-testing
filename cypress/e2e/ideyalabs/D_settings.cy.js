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
import { randomFourDigitNumber } from '../../support/utils/stringTools';

describe('Settings', () => {
  const textFieldData = { fieldLabel: `Test${randomFourDigitNumber()}`, helpText: `Testdata${randomFourDigitNumber()}` };
  const testAreaData = { fieldLabel: `dataArea${randomFourDigitNumber()}`, helpText: `fillData${randomFourDigitNumber()}` };
  const checkboxData = { fieldLabel: `CheckBox${randomFourDigitNumber()}`, helpText: `testdata${randomFourDigitNumber()}` };
  const radioButtonData = { data: { fieldLabel: `RadioButton${randomFourDigitNumber()}`, helpText: `testData${randomFourDigitNumber()}`, label1: `Radio1${randomFourDigitNumber()}`, label2: `Radio2${randomFourDigitNumber()}` } };
  const label2 = `select${randomFourDigitNumber()}`;
  const singleSelectData = { data: { fieldLabel: `Single Select Dropdown${randomFourDigitNumber()}`, helpText: 'select One Data', label1: `Select${randomFourDigitNumber()}`, label2 } };

  before('login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
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
    const testData = {
      name: `Administrator${randomFourDigitNumber()}`,
      description: `Hello${randomFourDigitNumber()}`,
    };
    cy.visit(topMenu.permissionSetPath);
    customFields.clickOnNewButton();
    customFields.createPermission(testData);
    customFields.deletePermission(testData);
  });
  it('C16985 Settings | Set up a note type (spitfire)', { tags: [testTypes.extendedPath, devTeams.spitfire] }, () => {
    const noteData = `New Note${randomFourDigitNumber()}`;
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
  it('C731 Create new categories (thunderjet)', { tags: [testTypes.extendedPath, devTeams.thunderjet] }, () => {
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
  it('C367970 Check that User can save changes while edit ""Fixed due date schedules"" without changing ""Fixed due date schedules name"" field (vega)', { tags: [testTypes.criticalPath, devTeams.vega] }, () => {
    cy.visit(settingsMenu.circulationFixedDueDateSchedulesPath);
    eHoldingsProviders.editSchedule({ data: { name: 'Magnus test', description: `Test${randomFourDigitNumber()}` } });
  });
  after('delete test data', () => {
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
