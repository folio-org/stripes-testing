import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag600: '600',
    marcValue: 'C380753 Black Panther (Fictitious character) Wakanda Forever',
    markedValue: 'C380753 Black Panther',
    linkedIconText: 'Linked to MARC authority',
    accordion: 'Subject',
    subjectValue:
      'C380753 Black Panther (Fictitious character) Wakanda Forever--Comic books, strips, etc',
    filterState: [
      'advancedSearch',
      'keyword==C380753 Black Panther or identifiers.value==n2016004081 or identifiers.value==no2020004029 or identifiers.value==2006108277 or identifiers.value==no 00041049',
    ],
    bib600AfterUnlinking: [
      46,
      '600',
      '0',
      '0',
      '$a C380753 Black Panther $c (Fictitious character) $t Wakanda Forever $v Comic books, strips, etc. $i comics $0 id.loc.gov/authorities/names/n2016004081 $4 .prt $2 test',
    ],
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380753.mrc',
      fileName: `testMarcFileC380753${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC380753.mrc',
      fileName: `testMarcFile380753${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C380753 Black Panther (Fictitious character) Wakanda Forever',
    },
  ];

  const createdRecordIDs = [];

  const bib600FieldValues = [
    46,
    testData.tag600,
    '0',
    '0',
    '$a C380753 Black Panther $c (Fictitious character) $v Comic books, strips, etc. $4 .prt $2 test $i comics $0 id.loc.gov/authorities/names/n2016004081 $0 id.loc.gov/authorities/names/no2020004029 $0 2006108277 $0 custom/field/no 00041049 ',
  ];

  const bib600AfterLinkingToAuth100 = [
    46,
    testData.tag600,
    '0',
    '0',
    '$a C380753 Black Panther $c (Fictitious character) $t Wakanda Forever',
    '$v Comic books, strips, etc. $i comics',
    '$0 id.loc.gov/authorities/names/n2016004081',
    '$4 .prt $2 test',
  ];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C380753 Link the "600" of "MARC Bib" field (with multiple "$0") with "100" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib600FieldValues);
      QuickMarcEditor.clickLinkIconInTagField(46);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthoritiesSearch.verifyFiltersState(testData.filterState[0], testData.filterState[1]);
      MarcAuthorities.selectTitle(testData.marcValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag600, 46);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib600AfterLinkingToAuth100);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.verifyInstanceSubject(
        0,
        0,
        `${testData.linkedIconText}${testData.subjectValue}`,
      );
      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
      InventoryInstance.goToPreviousPage();
      InventoryInstance.waitLoading();
      InventoryInstance.viewSource();
      InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
      InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
      MarcAuthorities.checkDetailViewIncludesText(testData.markedValue);
      InventoryInstance.goToPreviousPage();
      InventoryViewSource.waitLoading();
      InventoryViewSource.close();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.checkFieldsExist([testData.tag600]);
      QuickMarcEditor.clickUnlinkIconInTagField(46);
      QuickMarcEditor.checkUnlinkModal(testData.tag600);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib600AfterUnlinking);
      QuickMarcEditor.checkLinkButtonExistByRowIndex(46);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyInstanceSubject(
        0,
        0,
        `${testData.linkedIconText}${testData.subjectValue}`,
      );
      InventoryInstance.checkMarcAppIconAbsent(0);
      InventoryInstance.viewSource();
      InventoryViewSource.notContains(testData.linkedIconText);
    },
  );
});
