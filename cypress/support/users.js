import { Button, Select, TextField, including } from "../../interactors";

Cypress.Commands.add('createUser', (userLastName, patronGroup, email) => {
  cy.do([
    TextField(including('Last name')).fillIn(userLastName),
    Select(including('Patron group')).choose(patronGroup),
    TextField(including('Email')).fillIn(email),
    Button('Save & close').click(),
  ]);
});
