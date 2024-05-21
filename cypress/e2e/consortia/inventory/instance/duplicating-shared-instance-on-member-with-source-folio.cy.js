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
      newResourceTitleC410925: `C410925 instanceTitle${getRandomPostfix()}`,
      newResourceType: 'notated movement',
      source: INSTANCE_SOURCE_NAMES.FOLIO,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instanceC410925 = instanceData;
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceC410925.instanceId);
      cy.setTenant(Affiliations.College);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"hrid"=="${testData.instanceC410925Hrid}"`,
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C410925 (CONSORTIA) Duplicating shared instance on Member tenant with Source FOLIO (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceC410925.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.duplicate();
        InventoryNewInstance.fillResourceTitle(testData.newResourceTitleC410925);
        InventoryNewInstance.fillResourceType(testData.newResourceType);
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitInstanceRecordViewOpened(testData.newResourceTitleC410925);
        InventoryInstance.checkInstanceDetails([{ key: 'Source', value: testData.source }]);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceC410925Hrid = initialInstanceHrId;
        });
      },
    );
  });
});
