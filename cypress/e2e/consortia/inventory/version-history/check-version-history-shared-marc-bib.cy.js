import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
// import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Instance', () => {
    const marcFile = {
      marc: 'marcBibFileForC692169.mrc',
      fileName: `C692169 marcBibFileName${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
      instanceTitle: 'C692169 Stockholm International Film Festival',
    };
    const permissions = [
      Permissions.uiInventoryViewCreateEditInstances.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.consortiaInventoryShareLocalInstance.gui,
    ];
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();

      cy.withinTenant(Affiliations.College, () => {
        InventoryInstances.deleteInstanceByTitleViaApi('C692169');
        DataImport.uploadFilesViaApi(marcFile).then((ids) => {
          testData.instanceId = [...ids.createdInstanceIDs];
        });
      });

      cy.createTempUser(permissions).then((userProperties) => {
        testData.userProperties = userProperties;
        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: testData.userProperties.userId,
          permissions,
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        }).then(() => {
          cy.waitForAuthRefresh(() => {
            cy.reload();
            InventoryInstances.waitContentLoading();
          });
        });

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        InventoryInstance.deleteInstanceViaApi(testData.instanceId[0]);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C692169 Verify version history after sharing a local MARC instance (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C692169'] },
      () => {
        InventoryInstances.searchByTitle(marcFile.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.addValuesToExistingField(18, '300', `$a ${getRandomLetters(5)}`);
        QuickMarcEditor.saveAndCloseWithValidationWarnings();

        cy.pause();

        InventoryInstance.clickShareLocalInstanceButton();
        InventoryInstance.verifyShareInstanceModal(marcFile.instanceTitle);
        InventoryInstance.shareInstance();
        // InventoryInstance.waitForSharingToComplete();
        InventoryInstance.verifyCalloutMessage(
          `Local instance ${marcFile.fileName} has been successfully shared`,
        );

        // // Step 1: Search and select the instance
        // InventoryInstances.searchByTitle(testData.instanceId);
        // InventoryInstances.selectInstance();
        // InventoryInstance.waitLoading();

        // // Step 2: Share the local instance
        // InventoryInstance.clickShareLocalInstanceButton();
        // InventoryInstance.verifyShareInstanceModal(marcFile.title);
        // InventoryInstance.shareInstance();
        // InventoryInstance.verifyCalloutMessage(
        //   `Local instance ${marcFile.title} has been successfully shared`,
        // );

        // // Step 3: Verify version history
        // InventoryInstance.openViewSource();
        // InventoryInstance.openVersionHistory();
        // VersionHistorySection.waitLoading();
        // VersionHistorySection.verifyListOfChanges([
        //   'Shared',
        //   `${testData.user.lastName}, ${testData.user.firstName}`,
        // ]);
      },
    );
  });
});
