import uuid from 'uuid';

describe('Creating user with some permissions', () => {
  const lastNameUser = 'testPermLast';
  const userPermissionData = {
    userId: '',
    permissions: []
  };

  // credentials for the future login
  const userCreds = {
    username: 'testUsertest',
    password: 'TestPassword1984,'
  };

  before(() => {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getUserGroups({ limit: 1 });
  });

  beforeEach(() => {
    const userData = {
      username: 'testUsertest',
      active: true,
      barcode: uuid(),
      personal: {
        preferredContactTypeId: '002',
        firstName: 'testPermFirst',
        lastName: lastNameUser,
        email: 'test@folio.org',
      },
      patronGroup: Cypress.env('userGroups')[0].id,
      departments: []
    };

    // get needed permission name
    cy.getPermissionsApi({ query: 'displayName="Settings (tenant): Can edit language, localization, and currency"' })
      .then(({ body }) => {
        cy.log('permission name: ' + body.permissions[0].permissionName);
        userPermissionData.permissions = [body.permissions[0].permissionName];
      });

    // create user, set password, assign permissions
    cy.createUserApi(userData)
      .then(({ body }) => {
        userPermissionData.userId = body.id;
        cy.log('created user id: ' + body.id);
        cy.setUserPassword(userCreds);
        cy.log('user permission data params: ' + userPermissionData.userId + ' ' + userPermissionData.permissions);
        cy.addPermissionsToNewUserApi(userPermissionData);
      });
  });

  afterEach(() => {
    // delete created user after test
    cy.deleteUser(userPermissionData.userId);
  });

  it('should be possible to create a new user with specific permissions', function () {
    cy.login(userCreds.username, userCreds.password);
    // some test logic
  });
});
