import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C409474 autotestFileName ${getRandomPostfix()}`,
      tag010: {
        tag: '010',
        content: '$a 81153773',
      },
      source: 'MARC',
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
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
      'C409474 (CONSORTIA) Verify the " Edit MARC bibliographic record" button on Central tenant Instance page (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C409474'] },
      () => {
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.addNewField(testData.tag010.tag, testData.tag010.content, 3);
        cy.wait(2000);
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceDetails({
          instanceInformation: [{ key: 'Source', value: testData.source }],
        });
      },
    );
  });
});
