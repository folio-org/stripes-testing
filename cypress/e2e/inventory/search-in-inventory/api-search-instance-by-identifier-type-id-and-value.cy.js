import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      identifierTypeName: 'ISBN',
      identifierValue: `C359198-${randomPostfix}`,
      instanceTitle: `AT_C359198_FolioInstance_${randomPostfix}`,
    };
    let instanceId;
    let identifierTypeId;
    let instanceTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
        instanceTypeId = instanceTypes[0].id;
      });
      InventoryInstances.getIdentifierTypes({
        query: `name=="${testData.identifierTypeName}"`,
      }).then((identifier) => {
        identifierTypeId = identifier.id;
      });
      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId,
            title: testData.instanceTitle,
            identifiers: [
              {
                value: testData.identifierValue,
                identifierTypeId,
              },
            ],
          },
        }).then((instanceData) => {
          instanceId = instanceData.instanceId;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C359198 API request | Verify that search for "Instance" record by "identifierTypeId" and "identifiers.value" values will succeed. (spitfire)',
      { tags: ['extendedPath', 'backend', 'spitfire', 'C359198'] },
      () => {
        cy.recurse(
          () => {
            return cy.okapiRequest({
              method: 'GET',
              path: 'search/instances',
              searchParams: {
                query: `identifiers.identifierTypeId="${identifierTypeId}" and identifiers.value="${testData.identifierValue}"`,
              },
              isDefaultSearchParamsRequired: false,
            });
          },
          (response) => {
            return response?.body?.totalRecords === 1;
          },
          {
            limit: 20,
            timeout: 40000,
            delay: 1000,
          },
        ).then((response) => {
          expect(response.status).to.eq(200);
          const foundInstance = response.body.instances[0];
          expect(foundInstance.id).to.eq(instanceId);
          expect(foundInstance.title).to.eq(testData.instanceTitle);
        });
      },
    );
  });
});
