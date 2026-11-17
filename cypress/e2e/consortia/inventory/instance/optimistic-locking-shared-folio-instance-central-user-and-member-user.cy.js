import { INSTANCE_STATUS_TERM_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventorySteps from '../../../../support/fragments/inventory/inventorySteps';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C422037_FolioInstance_${randomPostfix}`,
        instanceTitleUpdatedByUser2: `AT_C422037_FolioInstance_${randomPostfix} Updated by user 2`,
      };
      const putInstanceUrl = '**/inventory/instances/*';

      before('Create test data and users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C422037_');

        // Shared instance with the source FOLIO: created in Central
        InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
          ({ instanceData }) => {
            testData.instanceId = instanceData.instanceId;
          },
        );
        cy.getStatisticalCodes({ limit: 1 }).then((statisticalCodes) => {
          testData.statisticalCodeId = statisticalCodes[0].id;
        });

        // User 1 is created in Central (the test starts there), has the Member affiliation and
        // the permission in both tenants
        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            testData.user1 = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.user1.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user1.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
          },
        );

        // User 2 is created in Member (the second window works there; the Central affiliation
        // is automatic) and has the permission in both tenants
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            testData.user2 = userProperties;

            cy.resetTenant();
            cy.assignPermissionsToExistingUser(testData.user2.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
          },
        );

        cy.then(() => {
          cy.resetTenant();
          cy.login(testData.user1.username, testData.user1.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete users and data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        // Each user is deleted from the tenant where it was created
        Users.deleteViaApi(testData.user1.userId);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user2.userId);

        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C422037 Verify the optimistic locking message works for instances in central tenant as one user and a different user in a member tenant (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C422037'] },
        () => {
          // Step 1: user 1 finds the shared instance in Central, opens its details
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 2: the second window (user 2 in the Member tenant) can't be opened in Cypress -
          // its edit is simulated via API at the step 5

          // Step 3: Actions > Edit instance
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();

          // Step 4: user 1 changes the instance status, does NOT save yet
          InstanceRecordEdit.chooseInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED);

          // Step 5: user 2 (the token of the Member tenant) saves another change (a statistical
          // code); the Member UI sends this update to Central
          cy.setTenant(Affiliations.College);
          cy.getToken(testData.user2.username, testData.user2.password);
          cy.resetTenant();
          cy.getInstanceById(testData.instanceId).then((instanceData) => {
            cy.updateInstance({
              ...instanceData,
              statisticalCodeIds: [testData.statisticalCodeId],
            });
          });
          // Back to user 1 - the UI session continues under its token
          cy.getToken(testData.user1.username, testData.user1.password);

          // Step 6: Save & close in the first window - the "not the most recent version"
          // message with the "View latest version" link
          cy.intercept('PUT', putInstanceUrl).as('saveInCentral');
          InstanceRecordEdit.clickSaveAndCloseButton();
          cy.wait('@saveInCentral').then((interception) => {
            expect(interception.response.statusCode).to.equal(409);
            expect(interception.request.headers['x-okapi-tenant']).to.equal(Affiliations.Consortia);
          });
          InventorySteps.verifyOptimisticLockingBanner();

          // Additional check: close the message (Cancel), log in the Member tenant as user 2
          // and edit the shared instance there - the update goes to Central and is saved
          InstanceRecordEdit.clickCancelButton();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          cy.logout();
          cy.setTenant(Affiliations.College);
          cy.login(testData.user2.username, testData.user2.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.fillResourceTitle(testData.instanceTitleUpdatedByUser2);

          cy.intercept('PUT', putInstanceUrl).as('saveFromMember');
          InstanceRecordEdit.clickSaveAndCloseButton();
          cy.wait('@saveFromMember').then((interception) => {
            expect(interception.response.statusCode).to.equal(204);
            expect(interception.request.headers['x-okapi-tenant']).to.equal(Affiliations.Consortia);
          });
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByUser2);
        },
      );
    });
  });
});
