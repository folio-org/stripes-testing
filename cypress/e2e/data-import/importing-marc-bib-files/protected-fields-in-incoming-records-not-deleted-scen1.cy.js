import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  TARGET_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsInventory, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    let instanceHrid;
    let instanceid;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const protectedFieldData = {
      protectedField: '856',
      in1: '*',
      in2: '*',
      subfield: '*',
      data: '*',
      source: 'User',
    };
    const OCLCAuthentication = '100481406/PAOLF';
    const oclcForChanging = '466478385';
    const imported856Field =
      'Notice et cote du catalogue de la Bibliothèque nationale de France $u http://catalogue.bnf.fr/ark:/12148/cb371881758';
    const fileName = `C358968 autotestFile${getRandomPostfix()}.mrc`;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.remoteStorageView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi('marcFileForC358968.mrc', fileName, jobProfileToRun).then(
          (response) => {
            instanceHrid = response[0].instance.hrid;
            instanceid = response[0].instance.id;
          },
        );

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        MarcFieldProtection.getListViaApi({
          query: `"field"=="${protectedFieldData.protectedField}"`,
        }).then((list) => {
          list.forEach(({ id }) => MarcFieldProtection.deleteViaApi(id));
        });
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceid);
      });
    });

    it(
      'C358968 Check that protected fields in incoming records are not deleted during import: Scenario 1 (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
        MarcFieldProtection.create(protectedFieldData);
        MarcFieldProtection.verifyFieldProtectionIsCreated(protectedFieldData.protectedField);

        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(SETTINGS_TABS.TARGET_PROFILES);

        Z3950TargetProfiles.openTargetProfile();
        Z3950TargetProfiles.editOclcWorldCat(
          OCLCAuthentication,
          TARGET_PROFILE_NAMES.OCLC_WORLDCAT,
        );
        Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(OCLCAuthentication);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        cy.wait(1000);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryEditMarcRecord.deleteField(29);
        InventoryEditMarcRecord.saveAndClose();
        cy.wait(1500);
        InventoryEditMarcRecord.saveAndClose();
        InventoryEditMarcRecord.confirmDeletingField();
        InventoryInstance.checkElectronicAccess();
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.singleOverlaySourceBibRecordModalIsPresented();
        InventoryInstance.overlayWithOclc(oclcForChanging);
        InventoryInstance.checkCalloutMessage(
          `Record ${oclcForChanging} updated. Results may take a few moments to become visible in Inventory`,
        );
        InventoryInstance.viewSource();
        InventoryViewSource.contains(`${protectedFieldData.protectedField}\t`);
        InventoryViewSource.contains(imported856Field);
      },
    );
  });
});
