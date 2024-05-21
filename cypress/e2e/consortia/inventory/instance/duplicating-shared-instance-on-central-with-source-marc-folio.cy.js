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
    const testData = {
      newResourceTitleC410927: `C410927 instanceTitle${getRandomPostfix()}`,
      newResourceType: 'notated movement',
      source: INSTANCE_SOURCE_NAMES.FOLIO,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instanceC410927 = instanceData;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceC410927.instanceId);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testData.instanceC410927Hrid}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C410927 (CONSORTIA) Duplicating shared instance on Central tenant with Source FOLIO (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceC410927.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.duplicate();
        InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410927);
        InventoryNewInstance.fillResourceType(testData.newResourceType);
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410927);
        InventoryInstance.checkInstanceDetails([{ key: 'Source', value: testData.source }]);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceC410927Hrid = initialInstanceHrId;
        });
      },
    );
  });
});
