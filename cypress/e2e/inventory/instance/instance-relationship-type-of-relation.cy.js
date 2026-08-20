import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_RELATIONSHIP_TYPES } from '../../../support/constants/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C619_FolioInstance_${randomPostfix}`;
    const testData = {
      mainInstanceTitle: `${instanceTitlePrefix}_Main`,
      parentInstanceTitle: `${instanceTitlePrefix}_Parent`,
      childInstanceTitle: `${instanceTitlePrefix}_Child`,
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.mainInstanceTitle,
          },
        }).then((createdInstance) => {
          testData.mainInstanceId = createdInstance.instanceId;
        });

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.parentInstanceTitle,
          },
        }).then((createdInstance) => {
          testData.parentInstanceId = createdInstance.instanceId;
          cy.getInstanceById(testData.parentInstanceId).then((body) => {
            testData.parentInstanceHrid = body.hrid;
          });
        });

        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.childInstanceTitle,
          },
        }).then((createdInstance) => {
          testData.childInstanceId = createdInstance.instanceId;
          cy.getInstanceById(testData.childInstanceId).then((body) => {
            testData.childInstanceHrid = body.hrid;
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.removeInstanceRelationshipsViaApi(testData.mainInstanceId);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.mainInstanceId);
      InventoryInstance.deleteInstanceViaApi(testData.parentInstanceId);
      InventoryInstance.deleteInstanceViaApi(testData.childInstanceId);
    });

    it(
      'C619 Instance Relationship --> Type of Relation (promin)',
      { tags: ['extendedPath', 'promin', 'C619'] },
      () => {
        // Step 1-2: Open Inventory and edit the main instance record
        InventoryInstances.searchByTitle(testData.mainInstanceId);
        InventoryInstances.selectInstanceById(testData.mainInstanceId);
        InventoryInstance.waitLoading();

        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 3: In Instance relationship accordion, add parent instance and select type of relation
        InstanceRecordEdit.addParentInstance(testData.parentInstanceTitle);
        InstanceRecordEdit.verifyParentInstance(
          testData.parentInstanceTitle,
          testData.parentInstanceHrid,
        );
        InstanceRecordEdit.selectParentRelationshipType(INSTANCE_RELATIONSHIP_TYPES.BOUND_WITH);
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryInstance.openInstanceRelationshipAccordion();
        InstanceRecordView.verifyParentInstanceTitle(
          testData.parentInstanceTitle,
          INSTANCE_RELATIONSHIP_TYPES.BOUND_WITH,
        );

        // Step 4: Go back in edit mode and add a child instance with a relationship type
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        InstanceRecordEdit.addChildInstance(testData.childInstanceTitle);
        InstanceRecordEdit.verifyChildInstance(
          testData.childInstanceTitle,
          testData.childInstanceHrid,
        );
        InstanceRecordEdit.selectChildRelationshipType(
          INSTANCE_RELATIONSHIP_TYPES.MONOGRAPHIC_SERIES,
        );
        InstanceRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();

        InstanceRecordView.verifyChildInstanceTitle(
          testData.childInstanceTitle,
          INSTANCE_RELATIONSHIP_TYPES.MONOGRAPHIC_SERIES,
        );
      },
    );
  });
});
