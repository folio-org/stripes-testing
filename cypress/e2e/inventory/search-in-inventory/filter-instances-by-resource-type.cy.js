import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const testData = {
        instancesTitlePrefix: `C476721 ${getRandomPostfix()}`,
      };
      const createdRecordIDs = [];
      let instanceTypes;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.getInstanceTypes({ limit: 200 })
            .then((types) => {
              instanceTypes = types.filter((item) => item.source === 'rdacontent');
            })
            .then(() => {
              for (let i = 0; i <= 10; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[i].id,
                    title: `${testData.instancesTitlePrefix} ${i}`,
                  },
                }).then((instance) => {
                  createdRecordIDs.push(instance.instanceId);
                });
              }
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventorySearchAndFilter.instanceTabIsDefault();
            });
        });
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476721 Filter "Instance" records by "Resource Type" filter/facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476721'] },
        () => {
          InventorySearchAndFilter.selectSearchOption(testData.classificationOption);
          InventorySearchAndFilter.executeSearch(testData.classificationValue);
          testData.instances.forEach((query) => {
            InventorySearchAndFilter.verifySearchResult(query.instanceTitle);
          });
          InventorySearchAndFilter.verifySearchResult(
            testData.instanceTitleWithLocalClassification,
          );
        },
      );
    });
  });
});
