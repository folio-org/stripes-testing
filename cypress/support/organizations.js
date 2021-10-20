import { Button, Select, TextField } from '../../interactors';

Cypress.Commands.add('createOrganization', ({ name, code, status }) => {
  const saveButton = Button({ id: 'organization-form-save' });

  cy.expect(saveButton.has({ disabled: true }));
  cy.do([
    Select({ id: 'select-9' }).choose(status),
    TextField({ id: 'name' }).fillIn(name),
    TextField({ id: 'text-input-7' }).fillIn(code),
  ]);
  cy.expect(saveButton.has({ disabled: false }));
  cy.do([
    Button({ id: 'organization-form-save' }).click(),
  ]);
});
