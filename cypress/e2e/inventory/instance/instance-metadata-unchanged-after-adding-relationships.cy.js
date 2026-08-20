import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
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
      instanceATitle: `AT_C1385642_FolioInstance_A_${randomPostfix}`,
      instanceBTitle: `AT_C1385642_FolioInstance_B_${randomPostfix}`,
      instanceCTitle: `AT_C1385642_FolioInstance_C_${randomPostfix}`,
      user: {},
    };

    before('Enable feature, create test data, login', () => {
      cy.getAdminToken();
      cy.setInventoryOptimizeUpdatesSetting(true);

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
        });
      });
    });

    after('Restore feature setting and delete test data', () => {
      cy.getAdminToken();
      cy.setInventoryOptimizeUpdatesSetting(false);
      InventoryInstance.removeInstanceRelationshipsViaApi(testData.instanceAId);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceAId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceBId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceCId);
    });

    it(
      'C1385642 Instance metadata is not updated after adding parent and child instance relationships when Prevent redundant updates in Inventory is enabled (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C1385642'] },
      () => {
        // Step 1: Search and open Instance A; note Record last updated
        InventoryInstances.searchByTitle(testData.instanceAId);
        InventoryInstances.selectInstanceById(testData.instanceAId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        cy.contains('button', /Record last updated:/)
          .invoke('text')
          .then((text) => {
            testData.originalLastUpdated = text;

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

            // Step 3: Verify Record last updated in Administrative data is unchanged
            InstanceRecordView.verifyLastUpdatedDateAndTime(
              testData.originalLastUpdated.split('updated: ')[1],
            );

            // Step 4: Open version history; verify no new version was created
            InstanceRecordView.clickVersionHistoryButton();
            VersionHistorySection.waitLoading();
            VersionHistorySection.verifyVersionsCount(1);
          });
      },
    );
  });
});
