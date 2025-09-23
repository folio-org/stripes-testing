import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
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
      const C402762testData = {
        filePath: 'oneMarcBib.mrc',
        marcFileName: `C402762 autotestFileName${getRandomPostfix()}.mrc`,
        instanceSource: INSTANCE_SOURCE_NAMES.MARC,
      };
      const C402763testData = {
        instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          C402762testData.filePath,
          C402762testData.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          C402762testData.instanceId = response[0].instance.id;
        });
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          C402763testData.instance = instanceData;
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            user = userProperties;
          },
        );
      });

      beforeEach('Login', () => {
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(C402762testData.instanceId);
        InventoryInstance.deleteInstanceViaApi(C402763testData.instance.instanceId);
      });

      it(
        'C402762 (CONSORTIA) Verify the Source of a MARC Instance on Central tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C402762'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.bySource(C402762testData.instanceSource);
          InventorySearchAndFilter.searchInstanceByTitle(C402762testData.instanceId);
          InventorySearchAndFilter.verifyInstanceDetailsView();
          InstanceRecordView.verifyInstanceSource(C402762testData.instanceSource);
          InstanceRecordView.verifyEditInstanceButtonIsEnabled();
        },
      );

      it(
        'C402763 (CONSORTIA) Verify the Source of a FOLIO Instance on Central tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C402763'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.bySource(C402763testData.instanceSource);
          InventorySearchAndFilter.searchInstanceByTitle(C402763testData.instance.instanceId);
          InventorySearchAndFilter.verifyInstanceDetailsView();
          InstanceRecordView.verifyInstanceSource(C402763testData.instanceSource);
          InstanceRecordView.verifyEditInstanceButtonIsEnabled();
        },
      );
    });
  });
});
