export default {
  goToMappingProfiles() {
    cy.visit('/settings/data-export/mapping-profiles');
  },

  goToJobProfiles() {
    cy.visit('/settings/data-export/job-profiles');
  },
};
