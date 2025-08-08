import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/instanceRecordView';
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
      marcFileName: `C411344 marcFileName${getRandomPostfix()}.mrc`,
    };
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        marcFile.marc,
        marcFile.marcFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
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
      cy.resetTenant();
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
      'C411344 (CONSORTIA) Check the "Share local instance" button on a source = MARC Instance on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411344'] },
      () => {
        cy.login(testData.user1.username, testData.user1.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.shareLocalInstance,
          false,
        );
      },
    );

    it(
      'C411333 (CONSORTIA) Check the "Share local instance" button on a shared Source = MARC Instance on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411333'] },
      () => {
        cy.login(testData.user2.username, testData.user2.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.shareLocalInstance,
          false,
        );
      },
    );

    it(
      'C411382 (CONSORTIA) Check the "Share local instance" button without permission on a shared Source = MARC Instance on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411382'] },
      () => {
        cy.login(testData.user3.username, testData.user3.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.shareLocalInstance,
          false,
        );
      },
    );

    it(
      'C411342 (CONSORTIA) Check the "Share local instance" button without permission on a local Source = MARC Instance on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411342'] },
      () => {
        cy.login(testData.user4.username, testData.user4.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.shareLocalInstance,
          false,
        );
      },
    );
  });
});
