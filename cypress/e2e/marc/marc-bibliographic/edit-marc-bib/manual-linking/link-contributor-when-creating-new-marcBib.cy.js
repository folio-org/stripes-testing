import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const fieldsToUpdate = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'The most important book',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    searchOptions: {
      personalName: 'Personal name',
      contributor: 'Contributors',
    },
    marcValue: 'C380726 Jackson, Peter, 1950-2022 Inspector Banks series ;',
    browseResult: 'C380726 Jackson, Peter, Inspector Banks series ; 1950-2022',
  };

  const newFields = [
    {
      rowIndex: 5,
      tag: '100',
      content: 'test123',
    },
    {
      rowIndex: 6,
      tag: '700',
      content: '',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380726.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
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
            DataImport.verifyUploadState();
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(marcFile.fileName);
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
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
  });

  it(
    'C422126 Link "Contributor" fields when creating "MARC Bibliographic" record (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });

      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        fieldsToUpdate.tags.tag245,
        `$a ${fieldsToUpdate.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        fieldsToUpdate.tags.tagLDR,
        fieldsToUpdate.fieldContents.tagLDRContent,
      );
      MarcAuthority.addNewField(4, newFields[0].tag, `$a ${newFields[0].content}`);
      QuickMarcEditor.checkLinkButtonExistByRowIndex(5);
      MarcAuthority.addNewField(5, newFields[1].tag, `$a ${newFields[1].content}`);
      QuickMarcEditor.checkLinkButtonExistByRowIndex(6);

      newFields.forEach((newField) => {
        QuickMarcEditor.clickLinkIconInTagField(newField.rowIndex);
        MarcAuthorities.searchByParameter(
          fieldsToUpdate.searchOptions.personalName,
          fieldsToUpdate.marcValue,
        );
        MarcAuthorities.selectTitle(fieldsToUpdate.marcValue);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(newField.rowIndex);
        QuickMarcEditor.verifyTagFieldAfterLinking(
          newField.rowIndex,
          newField.tag,
          '\\',
          '\\',
          '$a C380726 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
          '',
          '$0 3052044',
          '',
        );
      });

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Contributor');
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        5,
        '100',
        '\\',
        '\\',
        '$a C380726 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
        '',
        '$0 3052044',
        '',
      );
      QuickMarcEditor.verifyTagFieldAfterLinking(
        6,
        '700',
        '\\',
        '\\',
        '$a C380726 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
        '',
        '$0 3052044',
        '',
      );
      QuickMarcEditor.closeEditorPane();

      InventoryInstance.viewSource();
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t100\t   \t$a C380726 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022 $0 3052044 $9',
      );
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t700\t   \t$a C380726 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022 $0 3052044 $9',
      );
      QuickMarcEditor.closeEditorPane();

      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      BrowseContributors.select();
      BrowseContributors.browse(fieldsToUpdate.browseResult);
      BrowseSubjects.checkRowWithValueAndAuthorityIconExists(fieldsToUpdate.browseResult);
    },
  );
});
