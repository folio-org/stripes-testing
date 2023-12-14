describe('Title Level Request. Request Queue', () => {
  before('Create test data', () => {
    cy.getAdminToken();
  });

  after('Delete created data', () => {
    cy.getAdminToken();
  });
  it(
    'C347889 Check the user can change the queue in "Open - Not yet filled" accordion (vega) (TaaS)',
    { tags: ['extendedPath', 'vega'] },
    () => {},
  );
});
