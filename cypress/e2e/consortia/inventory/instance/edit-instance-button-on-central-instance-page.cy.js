import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      user: {},
      successMessage:
        'This shared instance has been saved centrally, and updates to associated member library records are in process. Changes in this copy of the instance may not appear immediately',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      StatisticalCodes.createViaApi().then((resp) => {
        testData.statisticalCode = `ARL (Collection stats):    ${resp.code} - ${resp.name}`;
        testData.statisticalCodeUI = resp.name;
        testData.statisticalCodeId = resp.id;
      });
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });
      cy.resetTenant();

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        cy.visit(TopMenu.inventoryPath);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      StatisticalCodes.deleteViaApi(testData.statisticalCodeId);
    });

    it(
      'C409460 (CONSORTIA) Verify the "Edit instance" button on Central tenant Instance page (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceId);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.addStatisticalCode(testData.statisticalCode);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyCalloutMessage(testData.successMessage);
        InstanceRecordView.verifyStatisticalCode(testData.statisticalCodeUI);
      },
    );
  });
});
