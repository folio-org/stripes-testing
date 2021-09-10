import { Button, Select, TextField } from '../../interactors';

Cypress.Commands.add('createUser', (userLastName, patronGroup, email) => {
  cy.do([
    TextField({ id: 'adduser_lastname' }).fillIn(userLastName),
    Select({ id: 'adduser_group' }).choose(patronGroup),
    TextField({ id: 'adduser_email' }).fillIn(email),
    Button({ id: 'clickable-save' }).click(),
  ]);
});
