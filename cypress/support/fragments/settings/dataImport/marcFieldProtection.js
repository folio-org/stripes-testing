
export default {
  createMarcFieldProtectionViaApi: (fieldBody) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'field-protection-settings/marc',
      body: fieldBody,
      isDefaultSearchParamsRequired: false
    }).then(({ body }) => {
      return body;
    });
  },

  deleteMarcFieldProtectionViaApi: (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `field-protection-settings/marc/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  }
};
