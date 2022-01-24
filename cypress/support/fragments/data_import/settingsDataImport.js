
export default {
  goToMappingProfiles() {
    cy.visit('/settings/data-import/mapping-profiles');
  },

  goToMatchProfiles() {
    cy.visit('/settings/data-import/match-profiles');
  },

  goToActionProfiles() {
    cy.visit('/settings/data-import/action-profiles');
  },

  goToJobProfiles() {
    cy.visit('/settings/data-import/job-profiles');
  }
};
