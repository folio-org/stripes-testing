Cypress.Commands.add('getSmtpStatus', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'smtp-configuration',
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});

// Messages FOLIO has sent to the address (mod-email), the newest first. Query by the exact
// recipient only: CQL wildcards on "header" return 500, so the subject is matched in JS
Cypress.Commands.add('getSentEmailsApi', (address) => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'email',
      searchParams: {
        query: `to=="${address}"`,
        limit: 20,
      },
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => {
      return [...(body.emailEntity || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
});

// Waits for the message with the subject (header) sent to the address, yields the newest one.
// Messages appear within ~5 sec; they are kept only for a short time, so call it right after
// the action which sends the email. minCount - how many messages with the subject are expected
// to be there (e.g. 2 when the same email is sent a second time and the new one is needed)
Cypress.Commands.add('waitForSentEmailApi', (address, subject, { minCount = 1 } = {}) => {
  const withSubject = (emails) => emails.filter((email) => email.header === subject);

  return cy
    .recurse(
      () => cy.getSentEmailsApi(address),
      (emails) => withSubject(emails).length >= minCount,
      {
        limit: 20,
        delay: 3000,
        timeout: 60_000,
      },
    )
    .then((emails) => withSubject(emails)[0]);
});
