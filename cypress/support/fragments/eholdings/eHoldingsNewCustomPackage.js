import { Button, HTML, TextField, including } from '../../../../interactors';

const caratButton = Button({ className: 'navButton---wRwTS interactionStylesControl---e1lwD button---mtWnz' });
const keyboardShortcut = Button('Keyboard shortcuts');
const KBcontent = Button({ id: 'content-item' });
const systemStatus = Button({ id: 'system-status-item' });

export default {

  waitLoading: () => {
    cy.expect(HTML(including('New custom package')).exists());
  },

  fillInRequiredProperties: (packageName) => {
    cy.do(TextField('Name*').fillIn(packageName));
  },
  saveAndClose: () => {
    cy.do(Button('Save & close').click());
  },
  clickOneHoldingCarat: () => {
    cy.do([caratButton.click(),
    KBcontent.click(),
    caratButton.click(),
    systemStatus.click(),
    caratButton.click(),
    keyboardShortcut.click()]);
  }
};
