import { HTML, including, Link } from '@interactors/html';
import { TextField } from 'bigtest';
import { Accordion, Button, Section, TextArea } from '../../../../interactors';

const rootSection = Section({ id:'pane-userdetails' });
const permissionAccordion = Accordion({ id: 'permissionsSection' });
const actionsButton = rootSection.find(Button('Actions'));
const errors = {
  patronHasBlocksInPlace:'Patron has block(s) in place'
};
const feesFinesAccourdion = rootSection.find(Accordion({ id : 'accountsSection' }));


export default {
  errors,
  openPatronBlocks() {
    cy.do(Accordion({ id: 'patronBlocksSection' }).clickHeader());
  },

  openLoans() {
    cy.do(Accordion({ id : 'loansSection' }).clickHeader());
  },
  openFeeFines() {
    cy.do(feesFinesAccourdion.clickHeader());
  },

  showOpenedLoans() {
    cy.do(Link({ id: 'clickable-viewcurrentloans' }).click());
  },

  createPatronBlock() {
    cy.do([
      Button({ id: 'create-patron-block' }).click()
    ]);
  },

  fillDescription(text) {
    cy.do(TextArea({ name: 'desc' }).fillIn(text));
  },

  saveAndClose() {
    cy.do(Button({ id: 'patron-block-save-close' }).click());
    cy.expect(Button({ id: 'patron-block-save-close' }).absent());
  },

  getApi(userId) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: `users/${userId}`,
      })
      .then(({ body }) => body);
  },

  verifyPermissions(permissions) {
    cy.do(permissionAccordion.clickHeader());
    permissions.forEach(permission => {
      cy.expect(permissionAccordion.find(HTML(including(permission))).exists());
    });
  },
  waitLoading:() => cy.expect(rootSection.exists()),
  startFeeFine: () => {
    cy.do(actionsButton.click());
    cy.do(Button('Create fee/fine').click());
  },
  hasSaveError: (errorMessage) => cy.expect(rootSection.find(TextField({ value: errorMessage })).exists()),
  startFeeFineAdding: () => cy.do(feesFinesAccourdion.find(Button('Create fee/fine')).click()),
  viewAllFeesFines:() => cy.do(feesFinesAccourdion.find(Button({ id: 'clickable-viewallaccounts' })).click()),
};
