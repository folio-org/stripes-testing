import { Button } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';

export default {
  createNewMappingProfile:() => {
    cy.do([
      Button('Actions').click(),
      Button('New field mapping profile').click()
    ]);
  },

  waitLoadingList:() => {
    cy.get('[id="mapping-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  },

  checkMappingProfilePresented: (mappingProfile) => {
    cy.get('[id="pane-results-content"]')
      .should('contains.text', mappingProfile.name);
  },

  waitLoadingMappingProfile:() => {
    cy.get('[id="full-screen-view-content"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  }
};
