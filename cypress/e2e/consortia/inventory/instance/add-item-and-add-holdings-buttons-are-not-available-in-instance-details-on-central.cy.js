import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle: `C411684 folio instance-${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
          }).then((instanceData) => {
            testData.instanceId = instanceData.instanceId;
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C411684 (CONSORTIA) Verify that the Add item and Add holdings buttons are not available in the Instance detail screen of Central tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411684'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyAddHoldingsButtonIsAbsent();
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyAddItemButtonIsAbsent({ holdingName: 'Consortial holdings' });
        },
      );
    });
  });
});
