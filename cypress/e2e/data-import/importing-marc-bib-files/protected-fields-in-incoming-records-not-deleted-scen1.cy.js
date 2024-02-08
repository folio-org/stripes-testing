import { TARGET_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    let instanceHrid;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
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

    before('create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi('marcFileForC358968.mrc', fileName, jobProfileToRun).then(
        (response) => {
          instanceHrid = response.relatedInstanceInfo.hridList[0];
        },
      );
      Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();

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

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        MarcFieldProtection.getListViaApi({
          query: `"field"=="${protectedFieldData.protectedField}"`,
        }).then((list) => {
          list.forEach(({ id }) => MarcFieldProtection.deleteViaApi(id));
        });
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C358968 Check that protected fields in incoming records are not deleted during import: Scenario 1 (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        cy.visit(SettingsMenu.marcFieldProtectionPath);
        MarcFieldProtection.verifyListOfExistingSettingsIsDisplayed();
        MarcFieldProtection.create(protectedFieldData);
        MarcFieldProtection.verifyFieldProtectionIsCreated(protectedFieldData.protectedField);

        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        Z3950TargetProfiles.editOclcWorldCat(
          OCLCAuthentication,
          TARGET_PROFILE_NAMES.OCLC_WORLDCAT,
        );
        Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(OCLCAuthentication);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        cy.wait(1000);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryEditMarcRecord.deleteField(29);
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
