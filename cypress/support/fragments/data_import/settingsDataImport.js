
export default {
  goToMappingProfile() {
    cy.visit('/settings/data-import/mapping-profiles');
  },

  goToActionProfile() {
    cy.visit('/settings/data-import/action-profiles');
  },

  goToJobProfile() {
    cy.visit('/settings/data-import/job-profiles');
  }
};
