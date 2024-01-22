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
      fileNameImported: `oneMarcBib.C411344.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    };
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();

      cy.loginAsAdmin().then(() => {
        ConsortiumManager.switchActiveAffiliation(tenantNames.college);
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
          InventoryInstance.shareInstanceViaApi(
            testData.instanceId,
            testData.consortiaId,
            Affiliations.College,
            Affiliations.Consortia,
          );
        });

      cy.resetTenant();
      cy.createTempUser([
        Permissions.uiInventoryViewCreateInstances.gui,
        Permissions.consortiaInventoryShareLocalInstance.gui,
      ]).then((userProperties) => {
        testData.user1 = userProperties;
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then((userProperties) => {
        testData.user2 = userProperties;
        cy.assignAffiliationToUser(Affiliations.College, testData.user2.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user2.userId, [
          Permissions.uiInventoryViewCreateInstances.gui,
          Permissions.consortiaInventoryShareLocalInstance.gui,
        ]);
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then((userProperties) => {
        testData.user3 = userProperties;
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then((userProperties) => {
        testData.user4 = userProperties;
        cy.assignAffiliationToUser(Affiliations.College, testData.user4.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user4.userId, [
          Permissions.uiInventoryViewCreateInstances.gui,
        ]);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user1.userId);
      Users.deleteViaApi(testData.user2.userId);
      Users.deleteViaApi(testData.user3.userId);
      Users.deleteViaApi(testData.user4.userId);
    });

    it(
      'C411344 (CONSORTIA) Check the "Share local instance" button on a source = MARC Instance on Central tenant',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user1.username, testData.user1.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );

    it(
      'C411333 (CONSORTIA) Check the "Share local instance" button on a shared Source = MARC Instance on Member tenant',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user2.username, testData.user2.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        ConsortiumManager.switchActiveAffiliation(tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );

    it(
      'C411382 (CONSORTIA) Check the "Share local instance" button without permission on a shared Source = MARC Instance on Central tenant',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user3.username, testData.user3.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );

    it(
      'C411342 (CONSORTIA) Check the "Share local instance" button without permission on a local Source = MARC Instance on Member tenant',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user4.username, testData.user4.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        ConsortiumManager.switchActiveAffiliation(tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );
  });
});
