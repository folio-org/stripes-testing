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
        instanceTitle: `AT_C422036_FolioInstance_${randomPostfix}`,
        instanceTitleUpdatedInMember: `AT_C422036_FolioInstance_${randomPostfix} Updated in Member`,
      };
      const putInstanceUrl = '**/inventory/instances/*';

      before('Create test data and user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C422036_');

        // Shared instance with the source FOLIO: created in Central
        InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
          ({ instanceData }) => {
            testData.instanceId = instanceData.instanceId;
          },
        );
        cy.getStatisticalCodes({ limit: 1 }).then((statisticalCodes) => {
          testData.statisticalCodeId = statisticalCodes[0].id;
        });

        // The user is created in Central (the test starts there), has the Member affiliation
        // and the permission in both tenants
        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
            cy.resetTenant();
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          },
        );
      });

      after('Delete user and data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C422036 Verify that optimistic locking and the message work for instances being edited in the Central tenant and in a Member tenant (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C422036'] },
        () => {
          // Step 1: find the shared instance in Central, open its details
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 2: the second window (the same user in the Member tenant) can't be opened in
          // Cypress - its edit is simulated via API at the step 5

          // Step 3: Actions > Edit instance
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();

          // Step 4: change the instance status, do NOT save yet
          InstanceRecordEdit.chooseInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED);

          // Step 5: the other window saves another change (a statistical code) - the same
          // update request, which makes the instance opened in the first window stale
          cy.getInstanceById(testData.instanceId).then((instanceData) => {
            cy.updateInstance({
              ...instanceData,
              statisticalCodeIds: [testData.statisticalCodeId],
            });
          });

          // Step 6: Save & close in the first window - the "not the most recent version"
          // message with the "View latest version" link; the request goes to Central
          cy.intercept('PUT', putInstanceUrl).as('saveInCentral');
          InstanceRecordEdit.clickSaveAndCloseButton();
          cy.wait('@saveInCentral').then((interception) => {
            expect(interception.response.statusCode).to.equal(409);
            expect(interception.request.headers['x-okapi-tenant']).to.equal(Affiliations.Consortia);
          });
          InventorySteps.verifyOptimisticLockingBanner();

          // Additional check: close the message (Cancel), switch to the Member tenant and edit
          // the shared instance there - the update goes to Central and is saved
          InstanceRecordEdit.clickCancelButton();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.fillResourceTitle(testData.instanceTitleUpdatedInMember);

          cy.intercept('PUT', putInstanceUrl).as('saveFromMember');
          InstanceRecordEdit.clickSaveAndCloseButton();
          cy.wait('@saveFromMember').then((interception) => {
            expect(interception.response.statusCode).to.equal(204);
            expect(interception.request.headers['x-okapi-tenant']).to.equal(Affiliations.Consortia);
          });
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedInMember);
        },
      );
    });
  });
});
