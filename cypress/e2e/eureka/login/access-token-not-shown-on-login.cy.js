import { Heading, including } from '../../../../interactors';

describe('Eureka', () => {
  describe('Login', () => {
    const tokenCallRegExp = /\/authn\/token/;

    it(
      'C423957 Access token not shown in request body when logging in (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C423957'] },
      () => {
        cy.intercept('GET', tokenCallRegExp).as('tokenCall');
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
      },
    );
  });
});
