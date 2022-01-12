/// <reference types="cypress" />

import uuid from 'uuid';
import { testType, feature } from '../../support/utils/tagTools';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';

describe('eHoldings packages management', () => {
  const userProperties = {
    username: 'autoTestUser4',
    password: 'Password1234,',
    userId:''
  };
  beforeEach(() => {
    const requiredPermissions = [
      'eHoldings: Can edit providers, packages, titles detail records',
      'eHoldings: Can view providers, packages, titles detail records',
      ' eHoldings: Can select/unselect packages and titles to/from your holdings'];

    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.getFirstUserGroupId({ limit: 1 })
      .then((userGroupdId) => {
        const userData = {
          username: userProperties.username,
          active: true,
          barcode: uuid(),
          personal: {
            preferredContactTypeId: '002',
            firstName: 'testPermFirst',
            lastName: userProperties.username,
            email: 'test@folio.org',
          },
          patronGroup: userGroupdId,
          departments: []
        };

        const queryField = 'displayName';
        cy.getPermissionsApi({ query: `(${queryField}="${requiredPermissions.join(`")or(${queryField}="`)}"))"` })
          .then((permissionsResponse) => {
            cy.createUserApi(userData)
              .then((userCreateResponse) => {
                userProperties.userId = userCreateResponse.body.id;
                cy.setUserPassword(userProperties);
                cy.addPermissionsToNewUserApi({
                  userId: userProperties.userId,
                  permissions : [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]
                });
              });
          });
      });

    cy.login(userProperties.username, userProperties.password);
    cy.visit(TopMenu.eholdings);
    eHoldingSearch.switchToPackages();
  });

  it('C688 Add a title in a package to holdings', { tags:  [testType.smoke, feature.eHoldings] }, () => {
  });

  afterEach(() => {
    cy.deleteUser(userProperties.userId);
  });
});
