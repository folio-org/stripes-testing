import { Button, Select, TextField } from '../../interactors';

Cypress.Commands.add(
  'createUser',
  (userLastName, patronGroup, email, userType = null, userName = null) => {
    if (userType) cy.do(Select({ id: 'type' }).choose(userType));
    if (userName) cy.do(TextField({ id: 'adduser_username' }).fillIn(userName));
    cy.do([
      TextField({ id: 'adduser_lastname' }).fillIn(userLastName),
      Select({ id: 'adduser_group' }).choose(patronGroup),
      TextField({ id: 'adduser_email' }).fillIn(email),
      Button({ id: 'clickable-save' }).click(),
    ]);
  },
);
