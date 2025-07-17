import { APPLICATION_NAMES, RECORD_STATUSES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Z3950TargetProfiles from '../../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      oclcNumberForImport: '1234568',
      oclcNumberForOverlay: '3213213',
      OCLCAuthentication: '100481406/PAOLF',
      instanceId: '',
      // updatedInstanceTitle:
      //   'Rincões dos frutos de ouro (tipos e cenarios do sul baiano) [por] Saboia Ribeiro.',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);

      cy.createTempUser([
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C418587 (CONSORTIA) Verify Inventory Single Record Import and log on central tenant when creating Shared Source = MARC Instance on central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C418587'] },
      () => {
        InventoryInstances.waitContentLoading();
        InventoryInstances.importWithOclc(testData.oclcNumberForImport);
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(testData.oclcNumberForOverlay);
        InventoryInstance.waitLoading();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        Logs.openViewAllLogs();
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${testData.user.firstName} ${testData.user.lastName}`);
        LogsViewAll.waitUIToBeFiltered();
        LogsViewAll.openFileDetails('No file name');
        FileDetails.verifyTitle(
          // testData.updatedInstanceTitle,
          FileDetails.columnNameInResultList.title,
        );
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
      },
    );
  });
});
