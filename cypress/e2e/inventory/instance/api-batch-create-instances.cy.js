import uuid from 'uuid';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Instances', () => {
    const testData = {
      source: 'FOLIO',
    };
    let instanceTypeId;
    let user;

    before('Get reference data and create user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C950872_FolioInstance');

      cy.getInstanceTypes({ query: 'name=="text"' }).then((instanceTypes) => {
        instanceTypeId = instanceTypes[0].id;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.inventoryStorageInstancesBatchUpdate.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C950872_FolioInstance');
      Users.deleteViaApi(user.userId);
    });

    it(
      'C950872 API | Create multiple Instances using POST instance-storage/batch/synchronous with / without upsert=true (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C950872'] },
      () => {
        // Step 1. Send POST ‘instance-storage/batch/synchronous’ with following body (without instance “id”)
        const instanceRecordsWithoutIdsOne = [
          {
            title: `AT_C950872_FolioInstance_One_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
          {
            title: `AT_C950872_FolioInstance_One_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateInstancesViaApi(instanceRecordsWithoutIdsOne).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });

        // Step 2. Find created Instances in "Inventory" search.
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        instanceRecordsWithoutIdsOne.forEach((instance) => {
          InventoryInstances.searchByTitle(instance.title);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifyInstanceDisplayed(instance.title, true);
        });

        // Step 3. Send POST ‘instance-storage/batch/synchronous’ with following body (without instance “id”, but with “upsert=true” parameter):
        const instanceRecordsWithoutIdsTwo = [
          {
            title: `AT_C950872_FolioInstance_Two_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
          {
            title: `AT_C950872_FolioInstance_Two_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
        ];

        cy.batchUpdateInstancesViaApi(instanceRecordsWithoutIdsTwo, { upsert: true }).then(
          (batchResponse) => {
            expect(batchResponse.status).to.eq(201);
          },
        );

        // Step 4. Find created Instances in "Inventory" search.
        instanceRecordsWithoutIdsTwo.forEach((instance) => {
          InventoryInstances.searchByTitle(instance.title);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifyInstanceDisplayed(instance.title, true);
        });

        // Step 5. Send POST ‘instance-storage/batch/synchronous’ with following body (with instance “id”, and with “upsert=true” parameter):
        const instanceRecordsWithIds = [
          {
            id: uuid(),
            title: `AT_C950872_FolioInstance_Three_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
          {
            id: uuid(),
            title: `AT_C950872_FolioInstance_Three_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
        ];

        cy.batchUpdateInstancesViaApi(instanceRecordsWithIds, { upsert: true }).then(
          (batchResponse) => {
            expect(batchResponse.status).to.eq(201);
          },
        );

        // Step 6. Find created Instances in "Inventory" search.
        instanceRecordsWithIds.forEach((instance) => {
          InventoryInstances.searchByTitle(instance.title);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifyInstanceDisplayed(instance.title, true);
        });

        // Step 7. Send POST ‘instance-storage/batch/synchronous’ with following body (with existing instance “id”, and with “upsert=true” parameter):
        const instanceRecordsWithIdsUpdated = [
          {
            _version: 1,
            id: instanceRecordsWithIds[0].id,
            title: `AT_C950872_FolioInstance_Three_Updated_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
          {
            _version: 1,
            id: instanceRecordsWithIds[1].id,
            title: `AT_C950872_FolioInstance_Three_Updated_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
          },
        ];

        cy.batchUpdateInstancesViaApi(instanceRecordsWithIdsUpdated, { upsert: true }).then(
          (batchResponse) => {
            expect(batchResponse.status).to.eq(201);
          },
        );

        // Step 8. Find updated Instances in "Inventory" search.
        instanceRecordsWithIdsUpdated.forEach((instance) => {
          InventoryInstances.searchByTitle(instance.title);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifyInstanceDisplayed(instance.title, true);
        });
      },
    );
  });
});
