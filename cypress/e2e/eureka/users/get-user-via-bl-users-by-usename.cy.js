import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      userBody: {
        type: 'staff',
        active: true,
        personal: {
          lastName: `UserForBL ${getRandomPostfix()}`,
          email: 'testuser@test.org',
          preferredContactTypeId: '002',
        },
      },
    };
    const userWithoutKeycloak = { ...testData.userBody };
    const userWithKeycloak = { ...testData.userBody };
    userWithoutKeycloak.username = `usernokc${getRandomPostfix()}`;
    userWithKeycloak.username = `userkc${getRandomPostfix()}`;

    before('Create data', () => {
      Cypress.session.clearCurrentSessionData();
      cy.getAdminToken();
      cy.getUserGroups().then((groupId) => {
        userWithoutKeycloak.patronGroup = groupId;
        cy.createUserWithoutKeycloakInEurekaApi(userWithoutKeycloak).then((userId) => {
          testData.userWithoutKeycloakId = userId;
        });
        Users.createViaApi(userWithKeycloak).then((user) => {
          testData.userWithKeycloakId = user.id;
        });
      });
    });

    after('Delete data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userWithKeycloakId);
      Users.deleteViaApi(testData.userWithoutKeycloakId);
    });

    it(
      'C451589 User details can be retrieved by API call to /bl-users/by-username (eureka)',
      { tags: ['smoke', 'eureka', 'C451589'] },
      () => {
        cy.getAdminToken();
        cy.getUserWithBlUsersByUsername(userWithoutKeycloak.username).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.user.username).to.eq(userWithoutKeycloak.username);
          expect(response.body.user.id).to.eq(testData.userWithoutKeycloakId);
          expect(response.body.user.active).to.eq(userWithoutKeycloak.active);
          expect(response.body.user.type).to.eq(userWithoutKeycloak.type);
        });

        cy.getUserWithBlUsersByUsername(userWithKeycloak.username).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.user.username).to.eq(userWithKeycloak.username);
          expect(response.body.user.id).to.eq(testData.userWithKeycloakId);
          expect(response.body.user.active).to.eq(userWithKeycloak.active);
          expect(response.body.user.type).to.eq(userWithKeycloak.type);
        });
      },
    );
  });
});
