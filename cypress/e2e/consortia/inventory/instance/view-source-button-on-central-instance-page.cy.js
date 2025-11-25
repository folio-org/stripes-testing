import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        filePath: 'oneMarcBib.mrc',
        marcFileName: `C409461 autotestFileName ${getRandomPostfix()}`,
        instanceSource: INSTANCE_SOURCE_NAMES.MARC,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          testData.filePath,
          testData.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
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
        'C409461 (CONSORTIA) Verify the "View source" button on Central tenant Instance page (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C409461'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InstanceRecordView.viewSource();
          InstanceRecordView.verifySrsMarcRecord();
          InventoryViewSource.contains('Shared MARC bibliographic record');
        },
      );
    });
  });
});
