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
  const testData = {
    newInstanceTitle: `C407749 instanceTitle${getRandomPostfix()}`,
  };

  before('Create test data', () => {
    cy.getAdminToken();

    cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui])
      .then((userProperties) => {
        testData.user = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.uiInventoryViewCreateEditInstances.gui,
        ]);

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.college);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });
      });
  });

  after('Delete test data', () => {
    InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C407749 (CONSORTIA) Verify the permission for editing local instances on Member tenant (folijet)',
    { tags: ['smokeECS', 'folijet'] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.fillResourceTitle(testData.newInstanceTitle);
        InstanceRecordEdit.saveAndClose();
        InteractorsTools.checkCalloutMessage(
          `The instance - HRID ${initialInstanceHrId} has been successfully saved.`,
        );
      });
      InstanceRecordView.verifyInstanceRecordViewOpened();
      InstanceRecordView.verifyResourceTitle(testData.newInstanceTitle);
    },
  );
});
