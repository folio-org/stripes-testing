import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

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

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.uiInventoryViewCreateEditInstances.gui,
        ]);

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.college);
      },
    );
  });

  after('Delete test data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C407751 (CONSORTIA) Verify the permission for editing shared instance on Member tenant (folijet)',
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