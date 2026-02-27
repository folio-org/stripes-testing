import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';

describe('MARC -> MARC Bibliographic -> derive MARC bib -> Manual linking', () => {
  let userData = {};
  const testData = {
    tag700: '700',
    rowIndex: 79,
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
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numOfRecords: 1,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuthFileC365585.mrc',
      fileName: `testMarcFileC365585${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
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
    cy.getAdminToken();
    // make sure there are no duplicate authority records in the system
    MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C365585*');

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

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
    MarcAuthority.deleteViaAPI(testData.createdRecordsIDs[1], true);
  });

  it(
    "C365585 Derive | Link 'MARC Bib' field with '$0' subfield which doesn't match to 'MARC Authority' record. 'Authority source file' value from the pre-defined list (700 field to 100) (spitfire) (TaaS)",
    { tags: ['extendedPath', 'spitfire', 'C365585'] },
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
      MarcAuthority.contains(`${marcAuthData.tag100}\t1  \t$a ${marcAuthData.tag100Value}`);
      MarcAuthorities.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
      QuickMarcEditor.pressSaveAndCloseButton();
      QuickMarcEditor.verifyAfterDerivedMarcBibSave();
      cy.wait(3000);
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinking);
      QuickMarcEditor.closeWithoutSaving();
      InventorySearchAndFilter.selectBrowseContributors();
      BrowseContributors.waitForContributorToAppear(marcAuthData.tag100Value, true, true);
      InventorySearchAndFilter.browseSearch(marcAuthData.tag100Value);
      InventorySearchAndFilter.checkMarcAuthAppIconInSearchResult();
      InventorySearchAndFilter.verifyContributorsColumResult(marcAuthData.tag100Value);
      InventorySearchAndFilter.clickMarcAuthIconByTitle(marcAuthData.tag100Value);
      MarcAuthorities.verifyMarcViewPaneIsOpened();
      MarcAuthority.contains(`${marcAuthData.tag100}\t1  \t$a ${marcAuthData.tag100Value}`);
    },
  );
});
