import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.setTenant(Affiliations.College);
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
        InventoryInstance.shareInstanceViaApi(
          testData.instance.instanceId,
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
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user1.userId);
      Users.deleteViaApi(testData.user2.userId);
      Users.deleteViaApi(testData.user3.userId);
      Users.deleteViaApi(testData.user4.userId);
    });

    it(
      'C411343 (CONSORTIA) Check the "Share local instance" button on a Source = FOLIO Instance on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411343'] },
      () => {
        cy.login(testData.user1.username, testData.user1.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );

    it(
      'C411329 (CONSORTIA) Check the "Share local instance" button on a shared Source = FOLIO Instance on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411329'] },
      () => {
        cy.login(testData.user2.username, testData.user2.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );

    it(
      'C411345 (CONSORTIA) Check the "Share local instance" button without permission on a Source = FOLIO Instance on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411345'] },
      () => {
        cy.login(testData.user3.username, testData.user3.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );

    it(
      'C411334 (CONSORTIA) Check the "Share local instance" button without permission on a local Source = FOLIO Instance on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411334'] },
      () => {
        cy.login(testData.user4.username, testData.user4.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );
  });
});
