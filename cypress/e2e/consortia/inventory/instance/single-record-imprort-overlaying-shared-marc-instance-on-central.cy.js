import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
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
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        oclcNumber: '1234568',
        OCLCAuthentication: '100481406/PAOLF',
        instanceId: '',
        marcFile: {
          path: 'oneMarcBib.mrc',
          fileName: `C402762 autotestFileName${getRandomPostfix()}.mrc`,
        },
        updatedInstanceTitle:
          'Rincões dos frutos de ouro (tipos e cenarios do sul baiano) [por] Saboia Ribeiro.',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
        DataImport.uploadFileViaApi(
          testData.marcFile.path,
          testData.marcFile.fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
        });

        cy.createTempUser([
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.settingsDataImportView.gui,
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
        'C418588 (CONSORTIA) Verify Inventory Single Record Import and log on central tenant when overlaying Shared Source = MARC Instance (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C418588'] },
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
});
