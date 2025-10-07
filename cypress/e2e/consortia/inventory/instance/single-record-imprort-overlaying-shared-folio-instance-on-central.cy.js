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
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        oclcNumber: '1234568',
        OCLCAuthentication: '100481406/PAOLF',
        instanceId: '',
        updatedInstanceTitle:
          'Rincões dos frutos de ouro (tipos e cenarios do sul baiano) [por] Saboia Ribeiro.',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;
        });

        cy.createTempUser([
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.settingsDataImportView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
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
        'C418589 (CONSORTIA) Verify Inventory Single Record Import and log on central tenant when overlaying Shared Source = FOLIO Instance (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C418589'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.overlayWithOclc(testData.oclcNumber);
          InventoryInstance.waitLoading();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          Logs.openViewAllLogs();
          LogsViewAll.openUserIdAccordion();
          LogsViewAll.filterJobsByUser(`${testData.user.firstName} ${testData.user.lastName}`);
          LogsViewAll.waitUIToBeFiltered();
          LogsViewAll.openFileDetails('No file name');
          FileDetails.verifyTitle(
            testData.updatedInstanceTitle,
            FileDetails.columnNameInResultList.title,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.CREATED,
            FileDetails.columnNameInResultList.srsMarc,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
          );
        },
      );
    });
  });
});
