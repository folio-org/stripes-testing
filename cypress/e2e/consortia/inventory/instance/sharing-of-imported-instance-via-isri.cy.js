import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      oclcNumberForImport: '1234568',
      OCLCAuthentication: '100481406/PAOLF',
      instanceTitle:
        'Rincões dos frutos de ouro (tipos e cenarios do sul baiano) [por] Saboia Ribeiro.',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.consortiaInventoryShareLocalInstance.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
        cy.setTenant(Affiliations.University);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
        cy.resetTenant();

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.inventoryAll.gui,
          Permissions.consortiaInventoryShareLocalInstance.gui,
          Permissions.settingsDataImportEnabled.gui,
        ]);

        cy.login(testData.user.username, testData.user.password);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.withinTenant(Affiliations.College, () => {
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHRID}"`,
        }).then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C422057 (CONSORTIA) Verify the sharing of imported instance via ISRI (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C422057'] },
      () => {
        InventoryInstances.waitContentLoading();
        InventoryInstances.importWithOclc(testData.oclcNumberForImport);
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.checkExpectedMARCSource();
        InventoryInstance.shareInstance();
        cy.waitForAuthRefresh(() => {
          cy.reload();
          InventoryInstance.waitLoading();
        }, 20_000);
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.checkExpectedMARCSource();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHRID = initialInstanceHrId;
        });

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByHRID(testData.instanceHRID);
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.checkExpectedMARCSource();

        ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByHRID(testData.instanceHRID);
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.checkExpectedMARCSource();
      },
    );
  });
});
