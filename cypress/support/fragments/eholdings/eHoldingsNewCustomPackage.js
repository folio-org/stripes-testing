import { HTML, including, Button, TextField } from '../../../../interactors';

export default {

  waitLoading:() => {
    cy.expect(HTML(including('New custom package')).exists());
  },

  fillInRequiredProperties: (packageName) => {
    cy.do(TextField('Name*').fillIn(packageName));
  },
  saveAndClose:() => {
    cy.do(Button('Save & close').click());
  },
  clickOneHoldingCarat: () => {
    cy.do(Button({ className: 'navButton---wRwTS interactionStylesControl---e1lwD button---mtWnz' }).click());
    cy.do(Button({ id: 'content-item' }).click())
    cy.do(Button({ className: 'navButton---wRwTS interactionStylesControl---e1lwD button---mtWnz' }).click())
    cy.do(Button({id: 'system-status-item'}).click())
    cy.do(Button({ className: 'navButton---wRwTS interactionStylesControl---e1lwD button---mtWnz' }).click())
    cy.do(Button("Keyboard shortcuts").click())
  }
};
