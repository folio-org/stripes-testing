import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      const C402760testData = {
        filePath: 'oneMarcBib.mrc',
        marcFileName: `C402760 autotestFileName ${getRandomPostfix()}`,
        instanceSource: INSTANCE_SOURCE_NAMES.MARC,
      };
      const C402761testData = {
        instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
            DataImport.uploadFileViaApi(
              C402760testData.filePath,
              C402760testData.marcFileName,
              DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            ).then((response) => {
              C402760testData.instanceId = response[0].instance.id;
            });
            InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
              C402761testData.instance = instanceData;
            });
            cy.resetTenant();
          });
      });

      beforeEach('Login', () => {
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(C402760testData.instanceId);
      });

      it(
        'C402760 (CONSORTIA) Verify the Source of a MARC, Local Instance on Member tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C402760'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.bySource(C402760testData.instanceSource);
          cy.wait(1500);
          InventorySearchAndFilter.byShared('No');
          cy.wait(1500);
          InventorySearchAndFilter.searchInstanceByTitle(C402760testData.instanceId);
          cy.wait(5000);
          InventorySearchAndFilter.verifyInstanceDetailsView();
          InstanceRecordView.verifyInstanceSource(C402760testData.instanceSource);
          InstanceRecordView.verifyEditInstanceButtonIsEnabled();
        },
      );

      it(
        'C402761 (CONSORTIA) Verify the Source of a FOLIO, local Instance on Member tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C402761'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.bySource(C402761testData.instanceSource);
          cy.wait(1500);
          InventorySearchAndFilter.byShared('No');
          cy.wait(1500);
          InventorySearchAndFilter.searchInstanceByTitle(C402761testData.instance.instanceId);
          cy.wait(5000);
          InventorySearchAndFilter.verifyInstanceDetailsView();
          InstanceRecordView.verifyInstanceSource(C402761testData.instanceSource);
          InstanceRecordView.verifyEditInstanceButtonIsEnabled();
        },
      );
    });
  });
});
