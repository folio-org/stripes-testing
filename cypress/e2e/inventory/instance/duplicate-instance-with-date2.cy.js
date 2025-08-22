import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import { INSTANCE_DATE_TYPES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C552517_FolioInstance_${getRandomPostfix()}`,
      duplicatedInstanceTitle: `AT_C552517_FolioInstance_${getRandomPostfix()}_DUPL`,
      initialDate1Value: '1999',
      initialDate2Value: '2001',
      date2Value: '2024',
      dateTypeValue: INSTANCE_DATE_TYPES.DETAILED,
    };

    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getInstanceDateTypesViaAPI().then((dateTypesResponse) => {
          InventoryInstance.createInstanceViaApi({
            instanceTitle: testData.instanceTitle,
          }).then(({ instanceData }) => {
            testData.instanceId = instanceData.instanceId;
            cy.getInstanceById(instanceData.instanceId).then((body) => {
              const updatedBody = { ...body };
              updatedBody.dates = {
                dateTypeId: dateTypesResponse.instanceDateTypes[0].id,
                date1: testData.initialDate1Value,
                date2: testData.initialDate2Value,
              };
              cy.updateInstance(updatedBody);
            });
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      InventoryInstances.deleteInstanceByTitleViaApi(testData.duplicatedInstanceTitle);
    });

    it(
      'C552517 Create a duplicate instance with Date 2 field only (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C552517'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InstanceRecordView.waitLoading();

        InstanceRecordView.duplicate();
        InventoryNewInstance.waitLoading();
        InstanceRecordEdit.verifyDateTypePlaceholderNotSelectable();

        InstanceRecordEdit.fillDates(undefined, testData.date2Value, testData.dateTypeValue);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.waitLoading();

        InstanceRecordView.verifyDates(undefined, testData.date2Value, testData.dateTypeValue);
      },
    );
  });
});
