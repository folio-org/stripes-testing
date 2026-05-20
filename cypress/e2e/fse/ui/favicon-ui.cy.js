describe('fse-favicon', { retries: { runMode: 1 } }, () => {
  it(
    `TC196415 - Verify favicon is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'favicon', 'TC196415'] },
    () => {
      // Visit the page
      cy.visit('/');

      // Get the favicon URL from the link tag in the HTML head
      cy.document().then((doc) => {
        const faviconLink = doc.querySelector('link[rel="icon"]');
        cy.expect(faviconLink).to.not.equal(null);

        const faviconHref = faviconLink.getAttribute('href');
        cy.expect(faviconHref).to.not.equal(undefined);
        cy.expect(faviconHref).to.not.equal('');

        // Verify favicon is accessible
        cy.request({
          url: faviconHref,
          failOnStatusCode: false,
        }).then((response) => {
          cy.expect(response.status).to.eq(200);
          cy.expect(response.headers['content-type']).to.match(/image/);
        });
      });
    },
  );
});
