import { Button, Select, TextField } from "../../interactors";

Cypress.Commands.add('createUser', (userLastName, patronGroup, email) => {
  cy.do([
    TextField('Last name\n*').fillIn(userLastName),
    Select('Patron group\n*').choose(patronGroup),
    TextField('Email\n*').fillIn(email),
    Button('Save & close').click(),
  ]);
});
