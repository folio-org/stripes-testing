import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Manual linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'Important book',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    marcAuthIcon: 'Linked to MARC authority',
    accordion: 'Title data',
  };

  const newFields = [
    {
      rowIndex: 5,
      tag: '800',
      content: '$t testT $0 123 $dtestD  $a testA $0 971255',
      boxFourth: '$a C380729 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
      boxFifth: '',
      boxSixth: '$0 3052044',
      boxSeventh: '',
      searchOption: 'Personal name',
      marcValue: 'C380729 Jackson, Peter, 1950-2022 Inspector Banks series ;',
      markedValue: 'C380729 Kerouac, Jack,',
      valueAfterSave: 'C380729 Jackson, Peter, 1950-2022 Inspector Banks series',
    },
    {
      rowIndex: 6,
      tag: '810',
      content: '$a test123',
      boxFourth:
        '$a C380729 John Bartholomew and Son. $l English $t Bartholomew world travel series $d 1995',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n84704570',
      boxSeventh: '',
      searchOption: 'Name-title',
      marcValue: 'C380729 John Bartholomew and Son. Bartholomew world travel series 1995 English',
      valueAfterSave:
        'C380729 John Bartholomew and Son. English Bartholomew world travel series 1995',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380729.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 3,
    },
  ];

  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile('Completed');
            Logs.openFileDetails(marcFile.fileName);
            for (let i = 0; i < marcFile.numOfRecords; i++) {
              Logs.getCreatedItemsID(i).then((link) => {
                createdAuthorityIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(userData.userId);
    for (let i = 0; i < 3; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[3]);
  });

  it(
    'C380729 Link "Series" fields when creating "MARC Bibliographic" record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      MarcAuthority.addNewField(4, newFields[0].tag, `$a ${newFields[0].content}`);
      QuickMarcEditor.checkLinkButtonExistByRowIndex(5);
      MarcAuthority.addNewField(5, newFields[1].tag, `$a ${newFields[1].content}`);
      QuickMarcEditor.checkLinkButtonExistByRowIndex(6);

      InventoryInstance.verifyAndClickLinkIcon(newFields[0].tag);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchInput(
        'keyword==testA estD testT or identifiers.value==123 or identifiers.value==971255',
      );
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthorities.checkRecordDetailPageMarkedValue(newFields[0].markedValue);
      MarcAuthorities.switchToBrowse();
      MarcAuthorities.verifyDisabledSearchButton();
      MarcAuthorityBrowse.checkSearchOptions();
      MarcAuthorityBrowse.searchBy(newFields[0].searchOption, newFields[0].marcValue);
      MarcAuthorities.checkRow(newFields[0].marcValue);
      MarcAuthorities.selectTitle(newFields[0].marcValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newFields[0].tag, newFields[0].rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        newFields[0].rowIndex,
        newFields[0].tag,
        '\\',
        '\\',
        `${newFields[0].boxFourth}`,
        `${newFields[0].boxFifth}`,
        `${newFields[0].boxSixth}`,
        `${newFields[0].boxSeventh}`,
      );

      InventoryInstance.verifyAndClickLinkIcon(newFields[1].tag);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorityBrowse.checkSearchOptions();
      MarcAuthorities.clickReset();
      MarcAuthorityBrowse.searchBy(newFields[1].searchOption, newFields[1].marcValue);
      MarcAuthorities.checkRow(newFields[1].marcValue);
      MarcAuthorities.selectTitle(newFields[1].marcValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newFields[1].tag, newFields[1].rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        newFields[1].rowIndex,
        newFields[1].tag,
        '\\',
        '\\',
        `${newFields[1].boxFourth}`,
        `${newFields[1].boxFifth}`,
        `${newFields[1].boxSixth}`,
        `${newFields[1].boxSeventh}`,
      );

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyRecordAndMarcAuthIcon(
        testData.accordion,
        `${testData.marcAuthIcon}\n${newFields[0].valueAfterSave}`,
      );
      InventoryInstance.verifyRecordAndMarcAuthIcon(
        testData.accordion,
        `${testData.marcAuthIcon}\n${newFields[1].valueAfterSave}`,
      );
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
      newFields.forEach((newField) => {
        QuickMarcEditor.verifyTagFieldAfterLinking(
          newField.rowIndex,
          newField.tag,
          '\\',
          '\\',
          `${newField.boxFourth}`,
          `${newField.boxFifth}`,
          `${newField.boxSixth}`,
          `${newField.boxSeventh}`,
        );
      });

      QuickMarcEditor.closeEditorPane();
      InventoryInstance.viewSource();
      InventoryViewSource.contains(
        `${testData.marcAuthIcon}\n\t${newFields[0].tag}\t   \t‡a C380729 Jackson, Peter, ‡d 1950-2022 ‡c Inspector Banks series ; ‡0 3052044 ‡9`,
      );
      InventoryViewSource.contains(
        `${testData.marcAuthIcon}\n\t${newFields[1].tag}\t   \t‡a C380729 John Bartholomew and Son. ‡l English ‡t Bartholomew world travel series ‡d 1995 ‡0 id.loc.gov/authorities/names/n84704570 ‡9`,
      );

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchByParameter(newFields[1].searchOption, newFields[1].marcValue);
      MarcAuthorities.checkRow(newFields[1].marcValue);
      MarcAuthorities.verifyNumberOfTitles(4, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(4, '1');
      InventorySearchAndFilter.verifySearchResult(testData.fieldContents.tag245Content);
      InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
    },
  );
});
