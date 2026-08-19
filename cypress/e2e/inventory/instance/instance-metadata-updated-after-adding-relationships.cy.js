import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { INSTANCE_RELATIONSHIP_TYPES } from '../../../support/constants/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

const capabSetsToAssign = [
  CapabilitySets.uiInventoryInstanceView,
  CapabilitySets.uiInventoryInstanceEdit,
];

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceATitle: `AT_C1385643_FolioInstance_A_${randomPostfix}`,
      instanceBTitle: `AT_C1385643_FolioInstance_B_${randomPostfix}`,
      instanceCTitle: `AT_C1385643_FolioInstance_C_${randomPostfix}`,
      user: {},
    };

    before('Ensure feature is disabled, create test data, login', () => {
      cy.getAdminToken();
      cy.setInventoryOptimizeUpdatesSetting(false);

      cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: { instanceTypeId: testData.instanceTypeId, title: testData.instanceATitle },
        }).then(({ instanceId }) => {
          testData.instanceAId = instanceId;
        });

        InventoryInstances.createFolioInstanceViaApi({
          instance: { instanceTypeId: testData.instanceTypeId, title: testData.instanceBTitle },
        }).then(({ instanceId }) => {
          testData.instanceBId = instanceId;
          cy.getInstanceById(instanceId).then((instance) => {
            testData.instanceBHrid = instance.hrid;
          });
        });

        InventoryInstances.createFolioInstanceViaApi({
          instance: { instanceTypeId: testData.instanceTypeId, title: testData.instanceCTitle },
        }).then(({ instanceId }) => {
          testData.instanceCId = instanceId;
          cy.getInstanceById(instanceId).then((instance) => {
            testData.instanceCHrid = instance.hrid;
          });
        });
      }).then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.wait(60_000); // wait to make sure time of update is different by minutes
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.removeInstanceRelationshipsViaApi(testData.instanceAId);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceAId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceBId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceCId);
    });

    it(
      'C1385643 Instance metadata is updated after adding parent and child instance relationships when Prevent redundant updates in Inventory is disabled (promin)',
      { tags: ['criticalPath', 'promin', 'C1385643'] },
      () => {
        // Step 1: Search and open Instance A; note Record last updated
        InventoryInstances.searchByTitle(testData.instanceAId);
        InventoryInstances.selectInstanceById(testData.instanceAId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        cy.contains('button', /Record last updated:/)
          .invoke('text')
          .then((text) => {
            // Step 2: Edit Instance A; add child B and parent C; save and verify
            InventoryInstance.editInstance();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.addChildInstance(testData.instanceBTitle);
            InstanceRecordEdit.verifyChildInstance(testData.instanceBTitle, testData.instanceBHrid);
            InstanceRecordEdit.selectChildRelationshipType(INSTANCE_RELATIONSHIP_TYPES.BOUND_WITH);
            InstanceRecordEdit.addParentInstance(testData.instanceCTitle);
            InstanceRecordEdit.verifyParentInstance(
              testData.instanceCTitle,
              testData.instanceCHrid,
            );
            InstanceRecordEdit.selectParentRelationshipType(INSTANCE_RELATIONSHIP_TYPES.BOUND_WITH);
            InstanceRecordEdit.saveAndClose();
            InstanceRecordEdit.verifySuccessfulMessage();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.openInstanceRelationshipAccordion();
            InstanceRecordView.verifyChildInstanceTitle(testData.instanceBTitle);
            InstanceRecordView.verifyParentInstanceTitle(testData.instanceCTitle);

            // Step 3: Verify Record last updated in Administrative data is newer than original
            InstanceRecordView.verifyLastUpdatedDateAndTime(text.split('updated: ')[1], {
              matches: false,
            });
          });
      },
    );
  });
});
