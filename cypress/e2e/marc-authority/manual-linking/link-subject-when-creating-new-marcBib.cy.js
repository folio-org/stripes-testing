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
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Manual linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'The most important book',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    marcAuthIcon: 'Linked to MARC authority',
    accordion: 'Subject',
  };

  const newFields = [
    {
      rowIndex: 5,
      tag: '600',
      content: '$e test123',
      boxFourth: '$a C380728 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
      boxFifth: '$e test123',
      boxSixth: '$0 3052044',
      boxSeventh: '',
      searchOption: 'Personal name',
      marcValue: 'C380728 Jackson, Peter, 1950-2022 Inspector Banks series ;',
      valueAfterSave: 'C380728 Jackson, Peter, Inspector Banks series ; 1950-2022 test123',
    },
    {
      rowIndex: 6,
      tag: '611',
      content: '$4 test123',
      boxFourth: '$a C380728 Mostly Chopin Festival. $e Orchestra $t sonet',
      boxFifth: '',
      boxSixth: '$0 997404',
      boxSeventh: '$4 test123',
      searchOption: 'Name-title',
      marcValue: 'C380728 Mostly Chopin Festival. sonet',
      valueAfterSave: 'C380728 Mostly Chopin Festival. Orchestra sonet',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380728.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 2,
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
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
  });

  it(
    'C380728 Link "Subject" fields when creating "MARC Bibliographic" record (spitfire) (TaaS)',
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

      newFields.forEach((newField) => {
        QuickMarcEditor.clickLinkIconInTagField(newField.rowIndex);
        MarcAuthorities.verifyDisabledSearchButton();
        MarcAuthorityBrowse.checkSearchOptions();
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.searchByParameter(newField.searchOption, newField.marcValue);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(newField.rowIndex);
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
        `${testData.marcAuthIcon}\n\t${newFields[0].tag}\t   \t‡a C380728 Jackson, Peter, ‡c Inspector Banks series ; ‡d 1950-2022 ‡e test123 ‡0 3052044 ‡9`,
      );
      InventoryViewSource.contains(
        `${testData.marcAuthIcon}\n\t${newFields[1].tag}\t   \t‡a C380728 Mostly Chopin Festival. ‡e Orchestra ‡t sonet ‡0 997404 ‡9`,
      );
      QuickMarcEditor.closeEditorPane();

      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseSubjects.select();
      BrowseSubjects.browse(newFields[0].valueAfterSave);
      BrowseSubjects.checkRowWithValueAndAuthorityIconExists(newFields[0].valueAfterSave);
    },
  );
});
