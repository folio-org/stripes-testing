import Users from '../../../support/fragments/users/users';

describe('Eureka', () => {
  describe('Login', () => {
    const testData = {};

    const tokenCallRegExp = /\/authn\/token/;

    before(() => {
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.user = createdUserProperties;
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C423957 Access token not shown in request body when logging in (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
      () => {
        cy.visit('/');
        cy.intercept('GET', tokenCallRegExp).as('tokenCall');
        cy.login(testData.user.username, testData.user.password);
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
      },
    );
  });
});
