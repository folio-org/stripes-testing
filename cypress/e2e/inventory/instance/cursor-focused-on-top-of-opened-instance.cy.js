import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      mainInstanceTitle: `AT_C494351_FolioInstance_Main_${randomPostfix}`,
      childInstanceTitle: `AT_C494351_FolioInstance_Child_${randomPostfix}`,
      mainInstanceId: null,
      childInstanceId: null,
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.childInstanceTitle,
          },
        }).then(({ instanceId }) => {
          testData.childInstanceId = instanceId;
        });
      })
        .then(() => {
          InventoryInstance.getInstanceRelationshipTypesViaApi({ limit: 1 }).then(
            (relationshipTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.mainInstanceTitle,
                  childInstances: [
                    {
                      subInstanceId: testData.childInstanceId,
                      instanceRelationshipTypeId: relationshipTypes[0].id,
                    },
                  ],
                },
              }).then(({ instanceId }) => {
                testData.mainInstanceId = instanceId;
              });
            },
          );
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.removeInstanceRelationshipsViaApi(testData.mainInstanceId);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.mainInstanceId);
      InventoryInstance.deleteInstanceViaApi(testData.childInstanceId);
    });

    it(
      'C494351 Cursor focused on the top of the opened Instance (promin)',
      { tags: ['extendedPath', 'promin', 'C494351'] },
      () => {
        // Step 1: Search and select the FOLIO instance that has a child relationship
        InventoryInstances.searchByTitle(testData.mainInstanceId);
        InventoryInstances.selectInstanceById(testData.mainInstanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 2: Open Edit instance; verify the pane is scrolled to the top
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.checkDefaultScrollFocusState();
      },
    );
  });
});
