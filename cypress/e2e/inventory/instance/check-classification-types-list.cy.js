import { InventoryInstance, InventoryInstances } from '../../../support/fragments/inventory';
import { ClassificationTypes } from '../../../support/fragments/settings/inventory';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      classificationTypes: [],
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        ClassificationTypes.getClassificationTypesViaApi().then(({ classificationTypes }) => {
          testData.classificationTypes = classificationTypes.map(({ name }) => name);
        });

        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });
      });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });
    });

    it(
      'C618 Classification --> Classification types (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C618'] },
      () => {
        // Click on instance from preconditions
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();

        // Click on "Actions", Select "Edit instance"
        const InstanceRecordEdit = InventoryInstance.editInstance();

        // Get classification types and compare with expected array
        InstanceRecordEdit.getClassificationOptionsList().then((options) => {
          const actualList = options.sort((a, b) => a.localeCompare(b));
          const expectedList = testData.classificationTypes.sort((a, b) => a.localeCompare(b));

          cy.expect(actualList).to.eql(expectedList);
        });
      },
    );
  });
});
