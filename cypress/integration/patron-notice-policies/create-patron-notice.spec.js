import { TextField, Button, TextArea } from '../../../interactors';

describe('FAT-1455 test', () => {
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit('/settings');
  });
  afterEach(() => {
    cy.get('.stripes__icon.icon-triangle-down.medium---jNVX7').click();
    cy.do(Button({ id: 'dropdown-clickable-delete-item' }).click());
    cy.do(Button({ id: 'clickable-delete-item-confirmation-confirm' }).click());
  });
  it('create new patron notice', () => {
    const nameExample = 'Test notice';
    cy.get('.label---zHSX1').contains('Circulation').click();
    cy.get('.NavListItem---fokVC').contains('Patron notice policies').click();
    cy.get('.inner---Xcm7F').click();
    cy.do(TextField({ id: 'notice_policy_name' }).fillIn(nameExample));
    cy.get('.labelText---SQtRl').click();
    cy.do(TextArea({ id: 'notice_policy_description' }).fillIn('Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum'));
    cy.do(Button({ id: 'footer-save-entity' }).click());
  });
});
