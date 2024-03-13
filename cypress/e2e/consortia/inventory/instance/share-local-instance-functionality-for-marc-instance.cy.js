import { JOB_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileNameImported: `oneMarcBib.C411292.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      title: 'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
    };
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();

      cy.loginAsAdmin().then(() => {
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileNameImported);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileNameImported);
        Logs.getCreatedItemID().then((instanceId) => {
          testData.instanceId = instanceId;
        });
      });

      cy.getConsortiaId()
        .then((consortiaId) => {
          testData.consortiaId = consortiaId;
        })
        .then(() => {
          cy.setTenant(Affiliations.College);
        });

      cy.resetTenant();
      cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.uiInventoryViewCreateInstances.gui,
          Permissions.consortiaInventoryShareLocalInstance.gui,
        ]);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C411292 (CONSORTIA) Check the action of the "Share local instance" button on Source = MARC Instance on Member tenant (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        InventoryInstance.clickShareLocalInstanceButton();
        InventoryInstance.verifyShareInstanceModal(marcFile.title);
        InventoryInstance.closeShareInstanceModal();
        InventoryInstance.clickShareLocalInstanceButton();
        InventoryInstance.shareInstance();
        InventoryInstance.verifyCalloutMessage(`Local instance ${marcFile.title} has been successfully shared`);
      }
    );
  });
});
