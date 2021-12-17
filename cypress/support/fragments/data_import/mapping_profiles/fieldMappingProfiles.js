import { Button, MultiColumnListCell, Section } from '../../../../../interactors';
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
    cy.expect(Section({ id: 'pane-results' }).find(MultiColumnListCell(mappingProfile.name)).exists());
  },

  closeViewModeForMappingProfile() {
    cy.do(Button('Close'));
  },

  waitLoadingMappingProfile:() => {
    cy.get('[id="full-screen-view-content"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  }
};
