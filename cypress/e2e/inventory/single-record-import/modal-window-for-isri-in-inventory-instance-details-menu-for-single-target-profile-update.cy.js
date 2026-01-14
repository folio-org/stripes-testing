import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ReImportModal from '../../../support/fragments/inventory/reImportModal';
import ViewTargetProfile from '../../../support/fragments/settings/inventory/integrations/viewTargetProfile';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Single record import', () => {
    let user;
    let instanceHRID;
    let instanceId;
    const OCLCAuthentication = '100481406/PAOLF';
    const profileForImport = 'Inventory Single Record - Default Update Instance (Default)';
    const fileName = `C375146 autotestFile${getRandomPostfix()}.mrc`;
    const targetIdentifier = '1234567';
    const targetProfile = {
      name: 'OCLC WorldCat',
      url: 'zcat.oclc.org/OLUCWorldCat',
      authentification: OCLCAuthentication,
      externalId: '@attr 1=1211 $identifier',
      internalId: '999ff$i',
    };
    const successCalloutMessage =
      'Record 1234567 updated. Results may take a few moments to become visible in Inventory';
    const instanceTitle = 'The Gospel according to Saint Mark : Evangelistib Markusib aglangit.';

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        'oneMarcBib.mrc',
        fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        instanceHRID = response[0].instance.hrid;
        instanceId = response[0].instance.id;
      });
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication, false);
      cy.loginAsAdmin({
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
      SettingsInventory.goToSettingsInventory();
      SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.TARGET_PROFILES);
      Z3950TargetProfiles.openTargetProfile();
      ViewTargetProfile.verifyTargetProfileForm(
        targetProfile.name,
        targetProfile.url,
        targetProfile.authentification,
        targetProfile.externalId,
        targetProfile.internalId,
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C375146 Verify the modal window for ISRI In inventory instance details menu for single target profile (update) (folijet)',
      { tags: ['criticalPath', 'folijet', 'C375146'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
        cy.wait(1000);
        InventorySearchAndFilter.selectSearchResultItem();
        cy.wait(1000);
        InventoryInstance.startOverlaySourceBibRecord();
        ReImportModal.verifyModalWithOneTargetProfile();
        ReImportModal.verifySelectTheProfileToBeUsedToOverlayTheCurrentDataField(profileForImport);
        ReImportModal.selectTheProfileToBeUsedToOverlayTheCurrentData(profileForImport);
        ReImportModal.fillEnterTheTargetIdentifier(targetIdentifier);
        ReImportModal.import();
        // need to wait because after the import the data in the instance is displayed for a long time
        // https://issues.folio.org/browse/MODCPCT-73
        cy.wait(7000);
        InteractorsTools.checkCalloutMessage(successCalloutMessage);
        InstanceRecordView.verifyInstanceIsOpened(instanceTitle);
      },
    );
  });
});
