import { Button } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';

export default class FieldMappingProfiles {
  static createNewMappingProfile() {
    cy.do([
      Button('Actions').click(),
      Button('New field mapping profile').click()
    ]);
  }

  static waitLoadingList() {
    cy.get('[id="mapping-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  }

  static specialMappingProfilePresented(mappingProfileTitle) {
    cy.get('[id="pane-results-content"]')
      .should('contains.text', mappingProfileTitle);
  }

  static waitLoadingMappingProfile() {
    cy.get('[id="full-screen-view-content"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  }

  /* static searchMappingProfile(mappingProfileTitle) {
      cy.do([
        SearchField({ id: 'input-search-mapping-profiles-field' }).fillIn(mappingProfileTitle),
        Button('Search').click(),
      ]);
    }

    Modal('Confirm multipiece check out').find(Button('Check out')).click(), */
}
