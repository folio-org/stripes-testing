import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        newResourceTitle: `C409468 instanceTitle${getRandomPostfix()}`,
        newResourceType: 'notated movement',
        source: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
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
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C409468 (CONSORTIA) Verify the "Duplicate instance" button on Central tenant Instance page (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C409468'] },
        () => {
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.duplicate();
          InventoryNewInstance.fillResourceTitle(testData.newResourceTitle);
          InventoryNewInstance.fillResourceType(testData.newResourceType);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitle);
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: testData.source }],
          });
        },
      );
    });
  });
});
