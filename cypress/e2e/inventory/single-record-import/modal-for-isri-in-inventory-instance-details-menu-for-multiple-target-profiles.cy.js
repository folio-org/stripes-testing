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
    let preconditionUserId;
    let user;
    let instanceHRID;
    let instanceId;
    let profileId;
    const OCLCAuthentication = '100481406/PAOLF';
    const fileName = `C375126 autotestFile${getRandomPostfix()}.mrc`;
    const newTargetProfileName = `C375126 autotest profile${getRandomPostfix()}`;
    const OCLCWorldCatTargetProfileName = 'OCLC WorldCat';
    const profileForOverlay = 'Inventory Single Record - Default Update Instance (Default)';
    const targetProfile = {
      name: 'OCLC WorldCat',
      url: 'zcat.oclc.org/OLUCWorldCat',
      authentification: OCLCAuthentication,
      externalId: '@attr 1=1211 $identifier',
      internalId: '999ff$i',
    };
    const testIdentifier = '1234567';
    const successCalloutMessage =
      'Record 1234567 updated. Results may take a few moments to become visible in Inventory';
    const instanceTitle = 'The Gospel according to Saint Mark : Evangelistib Markusib aglangit.';

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(
          'oneMarcBib.mrc',
          fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceHRID = response[0].instance.hrid;
          instanceId = response[0].instance.id;
        });
      });
      cy.getAdminToken().then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
        Z3950TargetProfiles.createNewZ3950TargetProfileViaApi(newTargetProfileName).then(
          (initialId) => {
            profileId = initialId;
          },
        );
      });
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
      Z3950TargetProfiles.openTargetProfile(profileId);
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
        Users.deleteViaApi(user.userId);
        Users.deleteViaApi(preconditionUserId);
        Z3950TargetProfiles.deleteTargetProfileViaApi(profileId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C375126 Verify the modal window for ISRI In inventory instance details menu for multiple target profiles (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
        cy.wait(1000);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.startOverlaySourceBibRecord();
        ReImportModal.verifyModalWithSeveralTargetProfiles();
        ReImportModal.verifyExternalTargetField(newTargetProfileName);
        ReImportModal.selectExternalTarget(OCLCWorldCatTargetProfileName);
        ReImportModal.selectTheProfileToBeUsedToOverlayTheCurrentData(profileForOverlay);
        ReImportModal.fillEnterTheTargetIdentifier(testIdentifier);
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
