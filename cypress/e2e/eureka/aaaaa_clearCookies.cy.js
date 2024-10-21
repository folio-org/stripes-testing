describe('Eureka - Clear All Cookies', () => {
  it(
    'Clear all cookies',
    {
      tags: ['clearCookies', 'eureka'],
    },
    () => {
      // workaround for EUREKA-396 - otherwise tests may fail in consecutive runs for different tenants
      cy.clearCookies({ domain: null });
    },
  );
});
