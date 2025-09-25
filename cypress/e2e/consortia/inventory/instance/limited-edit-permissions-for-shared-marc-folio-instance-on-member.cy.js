import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/instanceRecordView';
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
      const C402335testData = {
        filePath: 'oneMarcBib.mrc',
        marcFileName: `C402335 autotestFileName${getRandomPostfix()}.mrc`,
        instanceSource: INSTANCE_SOURCE_NAMES.MARC,
      };
      const C402376testData = {
        instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          C402335testData.filePath,
          C402335testData.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          C402335testData.instanceId = response[0].instance.id;
        });
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          C402376testData.instance = instanceData;
        });
        cy.resetTenant();

        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);
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
        InventoryInstance.deleteInstanceViaApi(C402335testData.instanceId);
        InventoryInstance.deleteInstanceViaApi(C402376testData.instance.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C402335 (CONSORTIA) Verify limited Edit permissions for Shared MARC instance on Member tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C402335'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.bySource(C402335testData.instanceSource);
          cy.wait(1500);
          InventorySearchAndFilter.byShared('Yes');
          cy.wait(1500);
          InventorySearchAndFilter.searchInstanceByTitle(C402335testData.instanceId);
          InventorySearchAndFilter.verifyInstanceDetailsView();
          InstanceRecordView.verifyInstanceSource(C402335testData.instanceSource);
          InstanceRecordView.validateOptionInActionsMenu(actionsMenuOptions.edit, false);
        },
      );

      it(
        'C402376 (CONSORTIA) Verify limited Edit permissions for Shared FOLIO instance on Member tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C402376'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.bySource(C402376testData.instanceSource);
          cy.wait(1500);
          InventorySearchAndFilter.byShared('Yes');
          cy.wait(1500);
          InventorySearchAndFilter.searchInstanceByTitle(C402376testData.instance.instanceId);
          cy.wait(5000);
          InventorySearchAndFilter.verifyInstanceDetailsView();
          InstanceRecordView.verifyInstanceSource(C402376testData.instanceSource);
          InstanceRecordView.validateOptionInActionsMenu(actionsMenuOptions.edit, false);
        },
      );
    });
  });
});
