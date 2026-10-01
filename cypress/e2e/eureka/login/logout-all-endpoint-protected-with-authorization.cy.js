import Users from '../../../support/fragments/users/users';

describe('Eureka', () => {
  describe('Login', () => {
    let user;

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1543985 "logout-all" endpoint is protected with authorization (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1543985'] },
      () => {
        // Setup (getAdminToken) leaves an admin "folioAccessToken" cookie behind, and
        // cy.okapiRequest auto-attaches matching cookies - clear it so step 1 genuinely has
        // no credentials
        cy.clearCookies({ domain: null });

        // Step 1: no token - 401
        cy.logoutAllViaApi().then((response) => {
          expect(response.status).to.eq(401);
          expect(response.body.errors[0].message).to.eq('Unauthorized');
        });

        // Step 2: log in via API and pull the JWT out of the Set-Cookie header - Eureka's
        // authn/login response body never includes the raw token, only expiry metadata
        cy.getToken(user.username, user.password).then((loginResponse) => {
          const accessTokenCookie = loginResponse.headers['set-cookie'].find((entry) => entry.includes('folioAccessToken'));
          const token = accessTokenCookie.match(/folioAccessToken=([^;]+)/)[1];

          // removing token from cookies so that it could be sent specifically via header
          cy.clearCookies({ domain: null });

          // Step 3: valid token, right after logging in - 204
          cy.logoutAllViaApi({ 'x-okapi-token': token }).then((response) => {
            expect(response.status).to.eq(204);
          });

          // Step 4: a different, non-existent token is rejected the same way as no token at all
          cy.getUsersKeycloakSelf({ 'x-okapi-token': 'non-existent-jwt-token' }).then(
            (response) => {
              expect(response.status).to.eq(401);
              expect(response.body.errors[0].message).to.eq('Unauthorized');
            },
          );
        });
      },
    );
  });
});
