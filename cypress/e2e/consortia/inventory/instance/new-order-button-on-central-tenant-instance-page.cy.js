import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      marcFileName: `C514842 marcFileName${getRandomPostfix()}.mrc`,
    };
    const instanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        instanceIds.push(instanceData.instanceId);
      });
      DataImport.uploadFileViaApi(
        marcFile.marc,
        marcFile.marcFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        instanceIds.push(response[0].instance.id);
      });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C514842 (CONSORTIA) Verify the "New order" button on Central tenant Instance page (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C514842'] },
      () => {
        instanceIds.forEach((id) => {
          InventoryInstances.searchByTitle(id);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.validateOptionInActionsMenu(actionsMenuOptions.newOrder, true);
          InventoryInstances.resetAllFilters();
        });
      },
    );
  });
});
