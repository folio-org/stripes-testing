import { APPLICATION_NAMES, RECORD_STATUSES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
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
        cy.setTenant(Affiliations.College);
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;
        });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiInventorySingleRecordImport.gui,
            Permissions.uiInventoryViewCreateEditInstances.gui,
            Permissions.settingsDataImportView.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C418585 (CONSORTIA) Verify Inventory Single Record Import and log on member tenant when overlaying Local Source = FOLIO Instance (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C418585'] },
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
