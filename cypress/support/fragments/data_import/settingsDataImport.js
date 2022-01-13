
export default {
  goToMappingProfile() {
    cy.visit('/settings/data-import/mapping-profiles');
  },

  goToMatchProfile() {
    cy.visit('/settings/data-import/match-profiles');
  },

  goToActionProfile() {
    cy.visit('/settings/data-import/action-profiles');
  },

  goToJobProfile() {
    cy.visit('/settings/data-import/job-profiles');
  }
};
