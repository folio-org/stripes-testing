Cypress.Commands.add('getAuthorizationPoliciesForEntityApi', (policyType, entityId) => {
  cy.okapiRequest({
    path: 'policies',
    searchParams: {
      query: `name="Policy for ${policyType}: ${entityId}"`,
      limit: 1000,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add('createAuthorizationPolicyApi', (requestBody) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'policies',
    body: requestBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add('updateAuthorizationPolicyApi', (policyId, requestBody) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `policies/${policyId}`,
    body: requestBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add('deleteAuthorizationPolicyApi', (policyId) => {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `policies/${policyId}`,
    isDefaultSearchParamsRequired: false,
  });
});
