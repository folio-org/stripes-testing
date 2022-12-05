import { HTML, including } from '@interactors/html';
import {
  Button,
  Pane,
  Accordion
} from '../../../../../interactors';

const viewPane = Pane({ id:'view-match-profile-pane' });

export default {
  edit:() => {
    // wait is needed to avoid so fast robot clicks
    cy.wait(1500);
    cy.do(viewPane.find(Button('Actions')).click());
    cy.do(Button('Edit').click());
    // need to wait untill the page will be laoded
    cy.wait(1000);
    cy.expect(Accordion('Match criterion').exists());
  },

  closeViewModeForMatchProfile:() => cy.do(viewPane.find(Button({ icon: 'times' })).click()),

  verifyExistingInstanceRecordField:() => {
    cy.expect(viewPane.find(HTML(including('Admin data: Instance UUID'))).exists());
  }
};
