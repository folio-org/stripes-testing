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

const randomNumber = Math.floor(Math.random(9000) * 1000) + 1000;

describe('Creating Permissions Set and Custom Fields', () => {
  it('login to Folio', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C2234__Create new permission set', () => {
    cy.visit(topMenu.permissionSetPath);
    customFields.clickONewButton();
    customFields.createPermission({
      name: `Adminstrator${randomNumber}`,
      description: `Hello${randomNumber}`,
    });
    customFields.deletePermission();
  });

  it('C15693__Create a text field custom field', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomTextField({
      fieldLabel: 'test',
      helpText: 'testdata',
    });
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTestField('test');
  });

  it('C15694__Create a text area custom field and add help text', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomTextArea({
      fieldLabel: 'dataArea',
      helpText: 'fillData',
    });
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyTestArea('dataArea');
  });

  it('C15695__Create a checkbox custom field', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomCheckBox({
      fieldLabel: 'CheckBoxx',
      helpText: 'testdata',
    });
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyCheckBox('CheckBoxx');
  });

  it('C15696__Create a radio button custom field', () => {
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomRadioButton({
      data: {
        fieldLabel: 'RadioButton',
        helpText: 'testData',
        label1: 'Radio1',
        label2: 'Radio2',
      },
    });
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifyRadioButton('RadioButton');
  });

  it('C15697__Create a single select custom field', () => {
    const label2 = `select${randomNumber}`;
    cy.visit(topMenu.customFieldsPath);
    customFields.addCustomSingleSelect({
      data: {
        fieldLabel: `Single Select Dropdown${randomNumber}`,
        helpText: 'select One Data',
        label1: `Select${randomNumber}`,
        label2,
      },
    });
    cy.visit(topMenu.usersPath);
    usersSearchPane.searchByKeywords('testing');
    usersSearchPane.selectFirstUser('Excel, Testing');
    usersSearchPane.verifySingleSeclect(
      `Single Select Dropdown${randomNumber}`,
      label2
    );
  });

  it('C16985__Settings | Set up a note type', () => {
    cy.visit(topMenu.notesPath);
    newNote.clickOnNew(`New Note${randomNumber}`);
    cy.visit(topMenu.agreementsPath);
    agreementsDetails.agreementlistClick();
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    newNote.clickOnNoteType(`New Note${randomNumber}`);
  });

  it('C1304__Settings | Edit a note type', () => {
    cy.visit(topMenu.notesPath);
    existingNoteEdit.clickEditButton(`Item${randomNumber}`);
    cy.visit(topMenu.agreementsPath);
    agreementsDetails.agreementlistClick();
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNewButton();
    newNote.clickOnNoteType(`Item${randomNumber}`);
    agreementsDetails.clickCancelButton();
    newNote.closeWithoutSaveButton();
    agreementsDetails.openNotesSection();
    agreementsDetails.clickOnNoteRecord();
    existingNoteView.gotoEdit();
    newNote.clickOnNoteType(`Item${randomNumber}`);
  });

  it('C731__Create new categories', () => {
    cy.visit(settingsMenu.organizationsPath);
    organizations.addNewCategory(`Test${randomNumber}`);
    cy.visit(topMenu.organizationsPath);
    organizations.searchByParameters('All', 'organization');
    organizations.selectOrganization('New organization');
    organizations.editOrganization();
    organizations.verifynewCategory(`Test${randomNumber}`);
  });

  it('C367970-Check that User can save changes while edit ""Fixed due date schedules"" without changing ""Fixed due date schedules name"" field', () => {
    cy.visit(settingsMenu.circulationFixedDueDateSchedulesPath);
    eHoldingsProviders.editSchedule({
      data: { name: 'Magnus test', description: `Test${randomNumber}` },
    });
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
});
