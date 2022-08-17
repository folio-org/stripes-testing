
export default {
  createMarcFieldProtectionViaApi: (fieldBody) => cy.okapiRequest({
    method: 'POST',
    path: 'field-protection-settings/marc',
    body: fieldBody,
    isDefaultSearchParamsRequired: false
  }),
};
