import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC -> MARC Bibliographic -> derive MARC bib -> Manual linking', () => {
  let userData = {};
  const testData = {
    tag700: '700',
    rowIndex: 80,
    content:
      '$a C365585 Kirby, Jack, $e creator. $0 http://id.loc.gov/authorities/names/n2019022493',
    createdRecordsIDs: [],
  };

  const marcAuthData = {
    tag010: '010',
    tag100: '100',
    tag010Value: 'n  77020008',
    tag100Value: 'C365585 Kirby, Jack',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC365585.mrc',
      fileName: `testMarcFileC365585${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuthFileC365585.mrc',
      fileName: `testMarcFileC365585${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
      propertyName: 'authority',
    },
  ];

  const bib700AfterLinkingToAuth100 = [
    testData.rowIndex,
    testData.tag700,
    '1',
    '\\',
    '$a C365585 Kirby, Jack',
    '$e creator.',
    '$0 http://id.loc.gov/authorities/names/n77020008',
    '',
  ];

  const bib700AfterLinking = [76, ...bib700AfterLinkingToAuth100.slice(1)];

  before('Creating user and test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordsIDs.push(record[marcFile.propertyName].id);
            });
          });
        });
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordsIDs[0]);
    MarcAuthority.deleteViaAPI(testData.createdRecordsIDs[1]);
  });

  it(
    "C365585 Derive | Link 'MARC Bib' field with '$0' subfield which doesn't match to 'MARC Authority' record. 'Authority source file' value from the pre-defined list (700 field to 100) (spitfire) (TaaS)",
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordsIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.checkContent(testData.content, testData.rowIndex);
      QuickMarcEditor.verifyRemoveLinkingModalAbsence();
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.clickReset();
      MarcAuthorities.switchToSearch();
      InventoryInstance.searchResults(marcAuthData.tag100Value);
      MarcAuthority.contains(`${marcAuthData.tag010}\t   \t$a ${marcAuthData.tag010Value}`);
      MarcAuthority.contains(`${marcAuthData.tag100}\t1  \t$a ${marcAuthData.tag100Value}`);
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
      QuickMarcEditor.checkUnlinkTooltipText(
        testData.rowIndex,
        'Unlink from MARC Authority record',
      );
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(testData.rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
      QuickMarcEditor.clickViewMarcAuthorityIconInTagField(testData.rowIndex);
      MarcAuthorities.verifyMarcViewPaneIsOpened();
      MarcAuthority.contains(`${marcAuthData.tag100}\t1  \t$a ${marcAuthData.tag100Value}`);
      cy.go('back');
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
      MarcAuthorities.clickReset();
      MarcAuthorities.switchToSearch();
      InventoryInstance.searchResults(marcAuthData.tag100Value);
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyAfterDerivedMarcBibSave();
      cy.wait(3000);
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinking);
      QuickMarcEditor.closeWithoutSaving();
      InventorySearchAndFilter.selectBrowseContributors();
      InventorySearchAndFilter.browseSearch(marcAuthData.tag100Value);
      InventorySearchAndFilter.checkMarcAuthAppIconInSearchResult();
      InventorySearchAndFilter.verifyContributorsColumResult(marcAuthData.tag100Value);
      InventorySearchAndFilter.clickMarcAuthIcon();
      MarcAuthorities.verifyMarcViewPaneIsOpened();
      MarcAuthority.contains(`${marcAuthData.tag100}\t1  \t$a ${marcAuthData.tag100Value}`);
    },
  );
});
