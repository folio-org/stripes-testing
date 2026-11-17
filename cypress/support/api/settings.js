import Tenant from '../tenant';

Cypress.Commands.add('getPermissions', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'perms/permissions?length=5',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getGobiSettings', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'gobi/orders/custom-mappings/ListedElectronicMonograph',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getTenantSettings', () => {
  const UpdatedUrl = encodeURI('service-points?query=cql.allRecords=1 sortby name&limit=2');
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

// Password validation rules of the tenant (mod-password-validator), Enabled and Disabled ones
Cypress.Commands.add('getPasswordValidationRulesApi', (searchParams = { limit: 100 }) => {
  return cy.okapiRequest({
    method: 'GET',
    path: 'tenant/rules',
    searchParams,
    isDefaultSearchParamsRequired: false,
  });
});

// The whole rule as it is returned by GET, with the changed fields (e.g. "state": "Disabled").
// PUT goes to "tenant/rules" - there is no route with the rule id in the path
Cypress.Commands.add('updatePasswordValidationRuleApi', (rule) => {
  return cy.okapiRequest({
    method: 'PUT',
    path: 'tenant/rules',
    body: rule,
    isDefaultSearchParamsRequired: false,
  });
});

// Sets the expiration of the create/reset password links (mod-users-bl configuration, a
// tenant-wide setting): creates the configuration entries or edits the existing ones. It runs in
// Node.js (cy.task) with an admin session of its own, so the browser session doesn't matter - the
// app of a logged in user can change the browser cookies, e.g. at the end of a test. Set a known
// value (e.g. 'hours', 24 - the default) to put it back, the old values are not kept on purpose:
// with parallel changes they could be outdated
Cypress.Commands.add('setPasswordResetLinkExpirationApi', (unitOfTime, time) => {
  return cy.task('setPasswordResetLinkExpiration', {
    okapiHost: Cypress.env('OKAPI_HOST'),
    tenant: Tenant.get(),
    username: Cypress.env('diku_login'),
    password: Cypress.env('diku_password'),
    unitOfTime,
    time,
  });
});
