import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import inventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
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
            authRefresh: true,
          }).then(() => {});

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
          // Step 1: Search and select the instance
          InventoryInstances.searchByTitle(marcFile.instanceTitle);
          InventorySearchAndFilter.byShared('No');
          cy.wait(1000);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.addValuesToExistingField(18, '300', `$a ${getRandomLetters(5)}`);
          QuickMarcEditor.pressSaveAndClose();

          // Step 2: Share the local instance
          InventoryInstance.shareInstance();
          InstanceRecordView.verifyInstanceSource('MARC');

          // Step 3: Verify version history
          InventoryInstance.viewSource();
          inventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.verifyListOfChanges([
            'Shared',
            `${testData.userProperties.lastName}, ${testData.userProperties.firstName}`,
          ]);
        },
      );
    });
  });
});
