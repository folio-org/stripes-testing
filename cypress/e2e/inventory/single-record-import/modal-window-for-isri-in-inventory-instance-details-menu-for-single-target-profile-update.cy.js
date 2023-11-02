import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ViewTargetProfile from '../../../support/fragments/settings/inventory/integrations/viewTargetProfile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InteractorsTools from '../../../support/utils/interactorsTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import ReImportModal from '../../../support/fragments/inventory/reImportModal';

describe('inventory', () => {
  describe('Single record import', () => {
    let user;
    let instanceHRID;
    const OCLCAuthentication = '100481406/PAOLF';
    const profileForImport = 'Inventory Single Record - Default Update Instance (Default)';
    const fileName = `C375146autotestFile.${getRandomPostfix()}.mrc`;
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

    before('login', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      cy.getAdminToken().then(() => {
        DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
        JobProfiles.waitFileIsImported(fileName);
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        ViewTargetProfile.verifyTargetProfileForm(
          targetProfile.name,
          targetProfile.url,
          targetProfile.authentification,
          targetProfile.externalId,
          targetProfile.internalId,
        );
      });

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

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C375146 Verify the modal window for ISRI In inventory instance details menu for single target profile (update) (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
        cy.wait(1000);
        InventorySearchAndFilter.selectSearchResultItem();
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
        InstanceRecordView.verifyIsInstanceOpened(instanceTitle);
      },
    );
  });
});
