/* eslint-disable no-unused-vars */
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';

describe('inventory', () => {
  describe('Instance', () => {
    const testData = {};
    before('navigate to Inventory', () => {
      cy.getAdminToken();
      cy.createAuthorizationRoleApi().then((role) => {
        cy.log(JSON.stringify(role, null, 2));
        testData.roleName = role.name;
        testData.roleId = role.id;
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.deleteCapabilitiesFromRoleApi(testData.roleId);
      cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
    });

    it('experiment', () => {
      cy.createTempUser().then((user) => {
        testData.user = user;
        cy.log(JSON.stringify(testData.user));
      });
      cy.getCapabilitiesApi(10).then((capabs) => {
        cy.getCapabilitySetsApi(10).then((capabSets) => {
          cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
            testData.roleId = roleId;
            cy.addCapabilitiesToNewRoleApi(
              roleId,
              capabs.map((capab) => capab.id),
            );
            cy.addCapabilitySetsToNewRoleApi(
              roleId,
              capabSets.map((capab) => capab.id),
            );
          });
        });
      });
    });
  });
});
