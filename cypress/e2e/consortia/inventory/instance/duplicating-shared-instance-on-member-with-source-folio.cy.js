import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
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
      newInstanceTitle: `C410924 instanceTitle${getRandomPostfix()}`,
      source: INSTANCE_SOURCE_NAMES.FOLIO,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);

        cy.login(testData.user1.username, testData.user1.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      cy.setTenant(Affiliations.College);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testData.instanceHrid}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C410925 (CONSORTIA) Duplicating shared instance on Member tenant with Source FOLIO (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        InstanceRecordView.duplicate();
        InventoryNewInstance.fillResourceTitle(testData.newInstanceTitle);
        InventoryNewInstance.fillResourceType();
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitInstanceRecordViewOpened(testData.newInstanceTitle);
        InventoryInstance.checkInstanceDetails([{ key: 'Source', value: testData.source }]);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHrid = initialInstanceHrId;
        });
      },
    );
  });
});
