import { Heading, including } from '../../../../interactors';

describe('Eureka', () => {
  describe('Login', () => {
    const tokenCallRegExp = /\/authn\/token/;
    const samlCallRegExp = /\/saml\/check/;

    it(
      'C423957 Access token not shown in request body when logging in (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C423957'] },
      () => {
        cy.intercept('GET', tokenCallRegExp).as('tokenCall');
        cy.intercept('GET', samlCallRegExp).as('samlCall');
        cy.loginAsAdmin();
        cy.wait('@tokenCall').then((call) => {
          expect(call.response.statusCode).to.eq(201);
          expect(Object.entries(call.response.body).length).to.eq(2);
          expect(call.response.body).to.have.property('accessTokenExpiration');
          expect(call.response.body).to.have.property('refreshTokenExpiration');
          expect(
            call.response.headers['set-cookie'].filter((entry) => entry.includes('folioAccessToken')).length,
          ).to.eq(1);
          expect(
            call.response.headers['set-cookie'].filter((entry) => entry.includes('folioRefreshToken')).length,
          ).to.eq(1);
        });
        cy.expect(Heading(including('Welcome')).exists());
        // TO DO: uncomment the following lines when EUREKA-629 is done
        // cy.get('@samlCall.all').then((calls) => {
        //   expect(calls).to.have.length(0);
        // });
      },
    );
  });
});
