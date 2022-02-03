import { Button, Select, TextField } from '../../interactors';

Cypress.Commands.add('createOrganization', ({ name, code, status }) => {
  cy.do([
    Select({ id: 'select-9' }).choose(status),
    TextField({ id: 'name' }).fillIn(name),
    TextField({ id: 'text-input-7' }).fillIn(code),
    Button({ id: 'organization-form-save' }).click(),
  ]);
});

Cypress.Commands.add('getOrganizationApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'organizations/organizations',
      searchParams
    });
});
