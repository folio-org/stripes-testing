/* eslint-disable no-console */
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      userBody: {
        type: 'staff',
        active: true,
        personal: {
          lastName: `AT_C451589_LastName_${getRandomPostfix()}`,
          email: 'AT_C451589@test.com',
          preferredContactTypeId: '002',
        },
      },
    };
    const userWithoutKeycloak = { ...testData.userBody };
    const userWithKeycloak = { ...testData.userBody };
    userWithoutKeycloak.username = `at_c451589_username_nokc_${getRandomPostfix()}`;
    userWithKeycloak.username = `at_c451589_username_kc_${getRandomPostfix()}`;

    before('Create data', () => {
      cy.getAdminToken();
      console.log('BEFORE block: After getting admin token');
      cy.getUserGroups().then((groupId) => {
        console.log('BEFORE block: After getting user groups');
        userWithoutKeycloak.patronGroup = groupId;
        cy.createUserWithoutKeycloakInEurekaApi(userWithoutKeycloak).then((userId) => {
          console.log('BEFORE block: After creating user without Keycloak');
          testData.userWithoutKeycloakId = userId;
        });
        Users.createViaApi(userWithKeycloak).then((user) => {
          console.log('BEFORE block: After creating user with Keycloak');
          testData.userWithKeycloakId = user.id;
        });
      });
    });

    after('Delete data', () => {
      cy.getAdminToken();
      console.log('AFTER block: After getting admin token');
      Users.deleteViaApi(testData.userWithKeycloakId);
      console.log('AFTER block: After deleting user with Keycloak');
      Users.deleteViaApi(testData.userWithoutKeycloakId);
      console.log('AFTER block: After deleting user without Keycloak');
    });

    it(
      'C451589 User details can be retrieved by API call to /bl-users/by-username (eureka)',
      { tags: ['smoke', 'eureka', 'shiftLeft', 'C451589'] },
      () => {
        cy.getAdminToken().then(() => {
          console.log('IT C451589 block: After getting admin token');
          cy.getUserWithBlUsersByUsername(userWithoutKeycloak.username).then((response) => {
            console.log('IT C451589 block: After getting user without Keycloak by username');
            expect(response.status).to.eq(200);
            expect(response.body.user.username).to.eq(userWithoutKeycloak.username);
            expect(response.body.user.id).to.eq(testData.userWithoutKeycloakId);
            expect(response.body.user.active).to.eq(userWithoutKeycloak.active);
            expect(response.body.user.type).to.eq(userWithoutKeycloak.type);
          });

          cy.getUserWithBlUsersByUsername(userWithKeycloak.username).then((response) => {
            console.log('IT C451589 block: After getting user with Keycloak by username');
            expect(response.status).to.eq(200);
            expect(response.body.user.username).to.eq(userWithKeycloak.username);
            expect(response.body.user.id).to.eq(testData.userWithKeycloakId);
            expect(response.body.user.active).to.eq(userWithKeycloak.active);
            expect(response.body.user.type).to.eq(userWithKeycloak.type);
          });
        });
      },
    );
  });
});
