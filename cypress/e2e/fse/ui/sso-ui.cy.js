describe('fse-sso - UI', () => {
  it(
    `TC195393 - verify that SSO button is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['fse', 'ui', 'sso'] },
    () => {
      cy.checkSsoButton();
    },
  );
});
