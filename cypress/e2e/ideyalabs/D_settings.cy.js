import CustomFields from '../../support/fragments/settings/users/customFields';
import TopMenu from '../../support/fragments/topMenu';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import { MultiColumnListCell } from '../../../interactors';
import agreementsDetails from '../../support/fragments/agreements/agreementsDetails';
import NewNote from '../../support/fragments/notes/newNote';
import ExistingNoteEdit from '../../support/fragments/notes/existingNoteEdit';
import existingNoteView from '../../support/fragments/notes/existingNoteView';
import organizations from '../../support/fragments/organizations/organizations';
import SettingsMenu from '../../support/fragments/settingsMenu';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';


const RandomNumber = Math.floor(Math.random(9000) * 1000) + 1000;

describe('Creating Permissions Set and Custom Fields', () => {
  it('login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });
  it('C2234__Create new permission set', () => {
    cy.visit(TopMenu.permissionSetPath);
    CustomFields.clickONewButton();
    CustomFields.createPermission({ name: 'Adminstrator', description: 'Hello' });
  });
  it('C15693__Create a text field custom field', () => {
    cy.visit(TopMenu.customFieldsPath);
    CustomFields.addCustomTextField({ fieldLabel: 'test', helpText: 'testdata' });
    cy.visit(TopMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTestField('test');
  });
  it('C15694__Create a text area custom field and add help text', () => {
    cy.visit(TopMenu.customFieldsPath);
    CustomFields.addCustomTextArea({ fieldLabel: 'dataArea', helpText: 'fillData' });
    cy.visit(TopMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTestArea('dataArea');
  });
  it('C15695__Create a checkbox custom field', () => {
    cy.visit(TopMenu.customFieldsPath);
    CustomFields.addCustomCheckBox({ fieldLabel: 'CheckBoxx', helpText: 'testdata' });
    cy.visit(TopMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyCheckBox('CheckBoxx');
  });
  it('C15696__Create a radio button custom field', () => {
    cy.visit(TopMenu.customFieldsPath);
    CustomFields.addCustomRadioButton({ data: { fieldLabel: 'RadioButton', helpText: 'testData', label1: 'Radio1', label2: 'Radio2' } });
    cy.visit(TopMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyRadioButton('RadioButton');
  });
  it('C15697__Create a single select custom field', () => {
    const label2 = `select${RandomNumber}`;
    cy.visit(TopMenu.customFieldsPath);
    CustomFields.addCustomSingleSelect({ data: { fieldLabel: `Single Select Dropdown${RandomNumber}`, helpText: 'select One Data', label1: `Select${RandomNumber}`, label2 } });
    cy.visit(TopMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifySingleSeclect(`Single Select Dropdown${RandomNumber}`, label2);
  });
  it('C16985__Settings | Set up a note type', () => {
    cy.visit(TopMenu.notesPath);
    NewNote.clickOnNew(`New Note${RandomNumber}`);
    cy.visit(TopMenu.agreementsPath);
    cy.do(MultiColumnListCell('2020 ACS Publications').click());
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    NewNote.clickOnNoteType(`New Note${RandomNumber}`);
  });
  it('C1304__Settings | Edit a note type', () => {
    cy.visit(TopMenu.notesPath);
    ExistingNoteEdit.clickEditButton(`Item${RandomNumber}`);
    cy.visit(TopMenu.agreementsPath);
    cy.do(MultiColumnListCell('2020 ACS Publications').click());
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    NewNote.clickOnNoteType(`Item${RandomNumber}`);
    agreementsDetails.clickCancelButton();
    NewNote.closeWithoutSaveButton();
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNoteRecord();
    existingNoteView.gotoEdit();
    NewNote.clickOnNoteType(`Item${RandomNumber}`);
  });
  it('C731__Create new categories', () => {
    cy.visit(SettingsMenu.organizationsPath);
    organizations.addNewCategory(`Test${RandomNumber}`);
    cy.visit(TopMenu.organizationsPath);
    organizations.searchByParameters('All', 'organization');
    organizations.selectOrganization('New organization');
    organizations.editOrganization();
    organizations.verifynewCategory(`Test${RandomNumber}`);
  });
  it('C367970-Check that User can save changes while edit ""Fixed due date schedules"" without changing ""Fixed due date schedules name"" field', () => {
    cy.visit(TopMenu.settingsPath);
    cy.visit(SettingsMenu.circulationFixedDueDateSchedulesPath);
    eHoldingsProviders.editSchedule({ data: { name: 'Magnus test', description: `Test${RandomNumber}` } });
  });

  it('C15701__Change custom fields order', () => {
    cy.visit(TopMenu.customFieldsPath);
    CustomFields.editButton();
    usersSearchPane.DragAndDropCustomFields();
    cy.visit(TopMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.VerifyDragItem();
  });
});
