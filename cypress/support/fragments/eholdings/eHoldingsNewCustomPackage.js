import { HTML, including, Button, TextField } from '../../../../interactors';

const carotButton = Button({ className: 'navButton---wRwTS interactionStylesControl---e1lwD button---mtWnz' });
const keyborardShortcut = Button('Keyboard shortcuts');
const KBcontent = Button({ id: 'content-item' });
const syatemStatus = Button({ id: 'system-status-item' });

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
    cy.do([carotButton.click(),
      KBcontent.click(),
      carotButton.click(),
      syatemStatus.click(),
      carotButton.click(),
      keyborardShortcut.click()]);
  }
};
