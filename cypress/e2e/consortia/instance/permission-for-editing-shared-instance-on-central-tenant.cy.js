import Permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory -> Instance -> Consortia', () => {
  let user;
  const testData = {
    newInstanceTitle: `C407746 instanceTitle${getRandomPostfix()}`,
  };

  before('Create test data', () => {
    cy.getAdminToken();
    InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
      testData.instance = instanceData;
    });

    cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
      (userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C407746 (CONSORTIA) Verify the permission for editing shared instance on Central tenant (consortia) (folijet)',
    { tags: ['smoke', 'folijet'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.edit();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.fillResourceTitle(testData.newInstanceTitle);
      InstanceRecordEdit.saveAndClose();
      InteractorsTools.checkCalloutMessage(
        'This shared instance has been saved centrally, and updates to associated member library records are in process. Changes in this copy of the instance may not appear immediately.',
      );
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyResourceTitle(testData.newInstanceTitle);
    },
  );
});
