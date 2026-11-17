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
        instanceTitle: `AT_C422038_FolioInstance_${randomPostfix}`,
        instanceTitleUpdatedInMember2: `AT_C422038_FolioInstance_${randomPostfix} Updated in Member 2`,
      };
      const putInstanceUrl = '**/inventory/instances/*';

      before('Create test data and user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        [Affiliations.College, Affiliations.Consortia].forEach((affiliation) => {
          cy.withinTenant(affiliation, () => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('C422038_');
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

        // The user is created in Member 1 (the test starts there), has the Member 2 affiliation
        // and the permission in both Member tenants and in Central (the update of a shared
        // instance goes to Central)
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
          },
        );

        cy.then(() => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete user and data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        // The user is deleted from the tenant where it was created
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C422038_');

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C422038_');
      });

      it(
        'C422038 Verify the optimistic locking message works for instances in 2 different member tenants (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C422038'] },
        () => {
          // Step 1: find the shared instance in Member 1, open its details
          cy.setTenant(Affiliations.College);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 2: the second window (the same user in Member 2) can't be opened in Cypress -
          // its edit is simulated via API at the step 5

          // Step 3: Actions > Edit instance
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();

          // Step 4: change the instance status, do NOT save yet
          InstanceRecordEdit.chooseInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED);

          // Step 5: the other window saves another change (a statistical code) - a Member UI
          // sends the update of a shared instance to Central, so does the API call
          cy.resetTenant();
          cy.getInstanceById(testData.instanceId).then((instanceData) => {
            cy.updateInstance({
              ...instanceData,
              statisticalCodeIds: [testData.statisticalCodeId],
            });
          });
          // Back to the tenant of the first window
          cy.setTenant(Affiliations.College);

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

          // Additional check: close the message (Cancel), switch to Member 2 and edit the shared
          // instance there - the update goes to Central and is saved
          InstanceRecordEdit.clickCancelButton();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          InventoryInstances.waitContentLoading();
          cy.setTenant(Affiliations.University);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.fillResourceTitle(testData.instanceTitleUpdatedInMember2);

          cy.intercept('PUT', putInstanceUrl).as('saveFromMember2');
          InstanceRecordEdit.clickSaveAndCloseButton();
          cy.wait('@saveFromMember2').then((interception) => {
            expect(interception.response.statusCode).to.equal(204);
            expect(interception.request.headers['x-okapi-tenant']).to.equal(Affiliations.Consortia);
          });
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedInMember2);
        },
      );
    });
  });
});
