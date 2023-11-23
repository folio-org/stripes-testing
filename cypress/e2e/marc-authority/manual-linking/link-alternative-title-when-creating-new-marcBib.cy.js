import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Manual linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'Secret archives',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    marcAuthIcon: 'Linked to MARC authority',
    accordion: 'Title data',
  };

  const newFields = [
    {
      rowIndex: 5,
      tag: '130',
      content: '',
      boxFourth: '$a C380727 Edinburgh tracts in mathematics and mathematical physics $l english',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n84801249',
      boxSeventh: '',
      searchOption: 'Uniform title',
      marcValue:
        'C380727 Edinburgh tracts in mathematics and mathematical physics no. 19. english England',
      valueAfterSave: 'C380727 Edinburgh tracts in mathematics and mathematical physics english',
    },
    {
      rowIndex: 6,
      tag: '240',
      content: '$9 test123',
      boxFourth: '$a C380727 Hosanna Bible',
      boxFifth: '',
      boxSixth: '$0 id.loc.gov/authorities/names/n99036055',
      boxSeventh: '',
      searchOption: 'Name-title',
      marcValue: 'C380727 Abraham, Angela, 1958- C380727 Hosanna Bible',
      valueAfterSave: 'C380727 Hosanna Bible',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380727.mrc',
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
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    for (let i = 0; i < 2; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
  });

  it(
    'C380727 Link "Alternative title" fields when creating "MARC Bibliographic" record (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
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
        InventoryInstance.verifyAndClickLinkIcon(newField.tag);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorityBrowse.checkSearchOptions();
        MarcAuthorityBrowse.searchBy(newField.searchOption, newField.marcValue);
        MarcAuthorities.checkRow(newField.marcValue);
        MarcAuthorities.selectTitle(newField.marcValue);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newField.tag, newField.rowIndex);
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
        `${testData.marcAuthIcon}\n\t${newFields[0].tag}\t   \t$a C380727 Edinburgh tracts in mathematics and mathematical physics $l english $0 id.loc.gov/authorities/names/n84801249 $9`,
      );
      InventoryViewSource.contains(
        `${testData.marcAuthIcon}\n\t${newFields[1].tag}\t   \t$a C380727 Hosanna Bible $0 id.loc.gov/authorities/names/n99036055 $9`,
      );

      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.searchByParameter(newFields[1].searchOption, newFields[1].marcValue);
      MarcAuthorities.checkRow(newFields[1].marcValue);
      MarcAuthorities.verifyNumberOfTitles(5, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
      InventorySearchAndFilter.verifySearchResult(testData.fieldContents.tag245Content);
      InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
    },
  );
});
