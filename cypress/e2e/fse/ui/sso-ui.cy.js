describe('fse-sso - UI', () => {
  it('TC195393 - verify that SSO button is displayed', { tags: ['fse', 'ui', 'sso'] }, () => {
    cy.checkSsoButton();
  });
});
