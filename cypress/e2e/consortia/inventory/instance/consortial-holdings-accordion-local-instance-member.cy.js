import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.setTenant(Affiliations.College);
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);

        cy.login(testData.user.username, testData.user.password);

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    });

    it(
      'C411620 (CONSORTIA) Verify the Consortial holdings accordion details on local Instance on Member Tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411620'] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyConsortiaHoldingsAccordion();
      },
    );
  });
});
