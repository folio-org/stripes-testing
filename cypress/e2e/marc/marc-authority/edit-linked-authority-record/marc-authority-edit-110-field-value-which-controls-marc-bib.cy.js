// import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
// import DataImport from '../../../../support/fragments/data_import/dataImport';
// import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
// import Users from '../../../../support/fragments/users/users';
// import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
// import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
// import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
// import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
// import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
// import { JOB_STATUS_NAMES } from '../../../../support/constants';
// import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
// import InventoryKeyboardShortcuts from '../../../../support/fragments/inventory/inventoryKeyboardShortcuts';
// import InventoryHotkeys from '../../../../support/fragments/inventory/inventoryHotkeys';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {};
  // const marcFiles = [
  //   {
  //     marc: 'marcBibFileC374139.mrc',
  //     fileName: `testMarcFileC374139${getRandomPostfix()}.mrc`,
  //     jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  // instanceTitle: '',
  // instanceAlternativeTitle: '',
  // },
  // {
  //   marc: 'marcAuthFileC374139.mrc',
  //   fileName: `testMarcFileC374139${getRandomPostfix()}.mrc`,
  //   jobProfileToRun: 'Default - Create SRS MARC Authority',
  // authorityHeading: '',
  // updatedAuthorityHeading: '',
  //   },
  // ];
  // const linkingTagAndValue = {
  //   rowIndex: 18,
  //   value: 'Beethoven, Ludwig van,',
  //   tag: '240',
  // };
  // const hotKeys = InventoryHotkeys.hotKeys;
  // const createdRecordIDs = [];

  before('Creating user, importing and linking records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      // marcFiles.forEach((marcFile) => {
      //   cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
      //     () => {
      //       DataImport.verifyUploadState();
      //       DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
      //       JobProfiles.search(marcFile.jobProfileToRun);
      //       JobProfiles.runImportFile();
      //       JobProfiles.waitFileIsImported(marcFile.fileName);
      //       Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      //       Logs.openFileDetails(marcFile.fileName);
      //       Logs.getCreatedItemsID().then((link) => {
      //         createdRecordIDs.push(link.split('/')[5]);
      //       });
      //     },
      //   );
      // });

      // cy.visit(TopMenu.inventoryPath).then(() => {
      //   InventoryInstances.searchByTitle(createdRecordIDs[0]);
      //   InventoryInstances.selectInstance();
      //   InventoryInstance.editMarcBibliographicRecord();
      //   InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
      //   MarcAuthorities.switchToSearch();
      //   InventoryInstance.verifySelectMarcAuthorityModal();
      //   InventoryInstance.searchResults(linkingTagAndValue.value);
      //   MarcAuthoritiesSearch.selectAuthorityByIndex(0);
      //   InventoryInstance.clickLinkButton();
      //   QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
      //     linkingTagAndValue.tag,
      //     linkingTagAndValue.rowIndex,
      //   );
      //   QuickMarcEditor.pressSaveAndClose();
      //   QuickMarcEditor.checkAfterSaveAndClose();
      // });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  // after('Deleting user, data', () => {
  //   cy.getAdminToken().then(() => {
  //     Users.deleteViaApi(testData.userProperties.userId);
  //     createdRecordIDs.forEach((id, index) => {
  //       if (index) MarcAuthority.deleteViaAPI(id);
  //       else InventoryInstance.deleteInstanceViaApi(id);
  //     });
  //   });
  // });

  it(
    'C374139 Edit tag value ("110") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {},
  );
});
