import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
        Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C602 In Accordion Administrative Data --> Instance status term --> (Validate matching settings) (folijet)',
      { tags: ['extendedPath', 'folijet', 'C602'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.getStatusTermsFromInstance().then((statusNames) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.INSTANCE_STATUS_TYPE);
          InstanceStatusTypes.verifyListOfStatusTypesIsIdenticalToListInInstance(statusNames);
        });
      },
    );

    it(
      'C604 In Accordion Administrative Data --> Go to the Statistical code --> (Validate matching settings) (folijet)',
      { tags: ['extendedPath', 'folijet', 'C604'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.clickAddStatisticalCodeButton();
        InstanceRecordEdit.getStatisticalCodesFromInstance().then((codes) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          InstanceRecordEdit.closeCancelEditingModal();
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
          StatisticalCodes.verifyListOfStatisticalCodesIsIdenticalToListInInstance(codes);
        });
      },
    );
  });
});
