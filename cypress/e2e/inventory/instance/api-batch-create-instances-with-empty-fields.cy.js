import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instances', () => {
    const testData = {
      source: 'FOLIO',
    };
    let instanceTypeId;
    let user;

    before('Get reference data and create user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C959216_FolioInstance');

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
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C959216_FolioInstance');
      Users.deleteViaApi(user.userId);
    });

    it(
      'C959216 API | Create multiple Instances using POST instance-storage/batch/synchronous with empty fields (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C959216'] },
      () => {
        // Step 1. Send POST ‘instance-storage/batch/synchronous’ with following body (with empty fields):
        const instanceRecordsWithEmptyFields = [
          {
            title: `AT_C959216_FolioInstance_One_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
            statisticalCodeIds: [''],
            administrativeNotes: [''],
            editions: [''],
            publicationFrequency: [''],
            publicationRange: [''],
            instanceFormatIds: [''],
            physicalDescriptions: [''],
            languages: [''],
            natureOfContentTermIds: [''],
            tags: {
              tagList: [''],
            },
          },
          {
            title: `AT_C959216_FolioInstance_Two_${getRandomPostfix()}`,
            source: testData.source,
            instanceTypeId,
            statisticalCodeIds: [''],
            administrativeNotes: [''],
            editions: [''],
            publicationFrequency: [''],
            publicationRange: [''],
            instanceFormatIds: [''],
            physicalDescriptions: [''],
            languages: [''],
            natureOfContentTermIds: [''],
            tags: {
              tagList: [''],
            },
          },
        ];

        cy.getToken(user.username, user.password);
        cy.batchUpdateInstancesViaApi(instanceRecordsWithEmptyFields).then((batchResponse) => {
          expect(batchResponse.status).to.eq(201);
        });
        cy.wait(1000);

        // Step 2. Find created Instance and check GET "/inventory/instances/<UUID>" response
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: 'title==AT_C959216_FolioInstance_One',
        }).then((record) => {
          cy.getInstanceById(record.id).then((instance) => {
            expect(instance.administrativeNotes).to.deep.equal([]);
            expect(instance.statisticalCodeIds).to.deep.equal([]);
            expect(instance.editions).to.deep.equal([]);
            expect(instance.physicalDescriptions).to.deep.equal([]);
            expect(instance.natureOfContentTermIds).to.deep.equal([]);
            expect(instance.instanceFormatIds).to.deep.equal([]);
            expect(instance.publicationFrequency).to.deep.equal([]);
            expect(instance.publicationRange).to.deep.equal([]);
            expect(instance.languages).to.deep.equal([]);
            expect(instance.tags.tagList).to.deep.equal([]);
          });
        });
      },
    );
  });
});
