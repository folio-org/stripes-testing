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
        instanceTitle: `AT_C422039_FolioInstance_${randomPostfix}`,
        instanceTitleUpdatedByUser2: `AT_C422039_FolioInstance_${randomPostfix} Updated by user 2`,
      };
      const putInstanceUrl = '**/inventory/instances/*';
      const permissions = [Permissions.uiInventoryViewCreateEditInstances.gui];

      before('Create test data and users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
          cy.withinTenant(affiliation, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('C422039_');
          });
        });
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
        cy.getStatisticalCodes({ limit: 1 }).then((statisticalCodes) => {
          testData.statisticalCodeId = statisticalCodes[0].id;
        });

        // Instance with the source FOLIO: created in Member 1 and shared
        cy.setTenant(Affiliations.College);
        InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
          ({ instanceData }) => {
            testData.instanceId = instanceData.instanceId;
            InventoryInstance.shareInstanceViaApi(
              testData.instanceId,
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
          },
        );

        // User 1 is created in Member 1 (the test starts there); both users have the
        // permission in Central, Member 1 and Member 2
        cy.setTenant(Affiliations.College);
        cy.createTempUser(permissions).then((userProperties) => {
          testData.user1 = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user1.userId);
          cy.assignPermissionsToExistingUser(testData.user1.userId, permissions);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user1.userId, permissions);
        });

        // User 2 is created in Member 2
        cy.setTenant(Affiliations.University);
        cy.createTempUser(permissions).then((userProperties) => {
          testData.user2 = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user2.userId);
          cy.assignPermissionsToExistingUser(testData.user2.userId, permissions);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user2.userId, permissions);
        });

        cy.then(() => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user1.username, testData.user1.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete users and data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        // Each user is deleted from the tenant where it was created
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user1.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C422039_');
        cy.setTenant(Affiliations.University);
        Users.deleteViaApi(testData.user2.userId);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C422039_');
      });

      it(
        'C422039 Verify the optimistic locking message works for instances in two different member tenants edited by two different users (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C422039'] },
        () => {
          // Step 1: user 1 finds the shared instance in Member 1, opens its details
          cy.setTenant(Affiliations.College);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 2: the second window (user 2 in Member 2) can't be opened in Cypress - its
          // edit is simulated via API at the step 5

          // Step 3: Actions > Edit instance
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();

          // Step 4: user 1 changes the instance status, does NOT save yet
          InstanceRecordEdit.chooseInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED);

          // Step 5: user 2 (the token of Member 2) saves another change (a statistical code);
          // the Member UI sends the update of a shared instance to Central
          cy.setTenant(Affiliations.University);
          cy.getToken(testData.user2.username, testData.user2.password);
          cy.resetTenant();
          cy.getInstanceById(testData.instanceId).then((instanceData) => {
            cy.updateInstance({
              ...instanceData,
              statisticalCodeIds: [testData.statisticalCodeId],
            });
          });
          // Back to user 1 in Member 1 - the UI session continues under its token
          cy.setTenant(Affiliations.College);
          cy.getToken(testData.user1.username, testData.user1.password);

          // Step 6: Save & close in the first window - the "not the most recent version"
          // message with the "View latest version" link; the update of the shared instance
          // from Member 1 goes to Central
          cy.intercept('PUT', putInstanceUrl).as('saveFromMember1');
          InstanceRecordEdit.clickSaveAndCloseButton();
          cy.wait('@saveFromMember1').then((interception) => {
            expect(interception.response.statusCode).to.equal(409);
            expect(interception.request.headers['x-okapi-tenant']).to.equal(Affiliations.Consortia);
          });
          InventorySteps.verifyOptimisticLockingBanner();

          // Additional check: close the message (Cancel), log in Member 2 as user 2 and edit the
          // shared instance there - the update goes to Central and is saved
          InstanceRecordEdit.clickCancelButton();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          cy.logout();
          cy.setTenant(Affiliations.University);
          cy.login(testData.user2.username, testData.user2.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.fillResourceTitle(testData.instanceTitleUpdatedByUser2);

          cy.intercept('PUT', putInstanceUrl).as('saveFromMember2');
          InstanceRecordEdit.clickSaveAndCloseButton();
          cy.wait('@saveFromMember2').then((interception) => {
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
