import uuid from 'uuid';
import Users from '../../../support/fragments/users/users';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Login', () => {
    const nonExistentUserId = uuid();
    // Any single capability set satisfies the precondition's "OR a capability set assigned"
    // branch - no Authorization role needed
    const capabSetsToAssign = [CapabilitySets.uiCheckout];

    let user;

    before('Create user with a capability set assigned directly', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssign);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1538664 "_self" endpoint is protected with authorization (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1538664'] },
      () => {
        // Setup (getAdminToken) leaves an admin "folioAccessToken" cookie behind, and
        // cy.okapiRequest auto-attaches matching cookies - clear it so steps 1-2 genuinely have
        // no credentials
        cy.clearCookies({ domain: null });

        // Step 1: no token, real user id - 401
        cy.getUsersKeycloakSelf({ 'x-okapi-user-id': user.userId }).then((response) => {
          expect(response.status).to.eq(401);
          expect(response.body.errors[0].message).to.eq('Unauthorized');
        });

        // Step 2: no token, non-existent user id - still 401 (rejected before user lookup)
        cy.getUsersKeycloakSelf({ 'x-okapi-user-id': nonExistentUserId }).then((response) => {
          expect(response.status).to.eq(401);
          expect(response.body.errors[0].message).to.eq('Unauthorized');
        });

        // Step 3: log in via API and pull the JWT out of the Set-Cookie header - Eureka's
        // authn/login response body never includes the raw token, only expiry metadata
        cy.getToken(user.username, user.password).then((loginResponse) => {
          const accessTokenCookie = loginResponse.headers['set-cookie'].find((entry) => entry.includes('folioAccessToken'));
          const token = accessTokenCookie.match(/folioAccessToken=([^;]+)/)[1];

          // removing token from cookies so that it could be sent specifically via header
          cy.clearCookies({ domain: null });

          // Step 4: valid token, real user id - 200 with that user's own info/permissions
          cy.getUsersKeycloakSelf({
            'x-okapi-user-id': user.userId,
            'x-okapi-token': token,
          }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.permissions).to.not.equal(undefined);
          });

          // Step 5: valid token, non-existent user id - 404 naming that id
          cy.getUsersKeycloakSelf({
            'x-okapi-user-id': nonExistentUserId,
            'x-okapi-token': token,
          }).then((response) => {
            expect(response.status).to.eq(404);
            expect(response.body.errors[0].message).to.include(
              `User was Not Found with: id = ${nonExistentUserId}`,
            );
          });
        });
      },
    );
  });
});
