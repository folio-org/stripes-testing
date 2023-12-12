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
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Manual linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'Title with repeatables',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
  };

  const newFields = [
    {
      rowIndex: 4,
      tag: '650',
      content: '$a value1',
      marcValue: 'C380730 John Bartholomew and Son. Bartholomew world travel series 1995 English',
      searchOption: 'Name-title',
    },
    {
      rowIndex: 5,
      tag: '650',
      content: '$a value2',
      marcValue: 'C380730 Jackson, Peter, 1950-2022 Inspector Banks series ;',
      searchOption: 'Personal name',
    },
    {
      rowIndex: 6,
      tag: '650',
      content: '$a value3',
      marcValue: 'C380730 Jackson, Peter, 1950-2022 Inspector Banks series ;',
      searchOption: 'Personal name',
    },
  ];

  const linkingTagAndValues = [
    {
      rowIndex: 5,
      value: 'C380738 Good and evil History',
      tag: 650,
      boxFourth: '$a C380738 Good and evil',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/subjects/sh2009125989',
      boxSeventh: '',
    },
    {
      rowIndex: 6,
      value: 'C380738 Oratory',
      tag: 650,
      boxFourth: '$a C380738 Oratory',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/subjects/sh85095299',
      boxSeventh: '',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380738.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 2,
    },
  ];

  const createdAuthorityIDs = [];

  before('Create user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

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
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
            });
          }
        });
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    for (let i = 0; i < 2; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
  });

  it(
    'C380738 Linking repeatable fields when creating a new "MARC bib" record (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });
      linkingTagAndValues.forEach((linking) => {
        QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(linking.value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
      });
      linkingTagAndValues.forEach((field) => {
        QuickMarcEditor.verifyTagFieldAfterLinking(
          field.rowIndex,
          `${field.tag}`,
          '\\',
          '\\',
          field.boxFourth,
          field.boxFifth,
          field.boxSixth,
          field.boxSeventh,
        );
      });
      QuickMarcEditor.moveFieldUp(5);
      QuickMarcEditor.deleteField(6);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyNoFieldWithContent(linkingTagAndValues[1].value);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        4,
        `${linkingTagAndValues[0].tag}`,
        '\\',
        '\\',
        linkingTagAndValues[0].boxFourth,
        linkingTagAndValues[0].boxFifth,
        linkingTagAndValues[0].boxSixth,
        linkingTagAndValues[0].boxSeventh,
      );

      QuickMarcEditor.closeEditorPane();
      InventoryInstance.viewSource();
      InventoryViewSource.verifyAbsenceOfValue(linkingTagAndValues[1].value);
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t650\t   \t$a C380738 Good and evil $0 id.loc.gov/authorities/subjects/sh2009125989 $9',
      );
    },
  );
});
