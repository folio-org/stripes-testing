import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
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
      tag245Content: 'Created MARC bib with linked field',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    marcAuthIcon: 'Linked to MARC authority',
    accordion: 'Contributor',
  };

  const newFields = {
    rowIndex: 5,
    tag: '100',
    content: 'test123',
    boxFourth: '$a C417050 Chin, Staceyann, $d 1972-',
    boxFifth: '',
    boxSixth: '$0 id.loc.gov/authorities/names/n2008052404',
    boxSeventh: '',
    searchOption: 'Personal name',
    marcValue: 'C417050 Chin, Staceyann, 1972-',
  };

  const marcFiles = [
    {
      marc: 'marcAuthFileForC417050.mrc',
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
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then((createdUserProperties) => {
      testData.userAData = createdUserProperties;

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
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userBData = createdUserProperties;
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userAData.userId);
    Users.deleteViaApi(testData.userBData.userId);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[0]);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
  });

  it(
    'C417050 Create | Verify that created MARC bib with linked field by user without "Edit" permissions can be opened (spitfire)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      cy.login(testData.userAData.username, testData.userAData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      MarcAuthority.addNewField(4, newFields.tag, `$a ${newFields.content}`);
      QuickMarcEditor.checkLinkButtonExistByRowIndex(5);

      QuickMarcEditor.clickLinkIconInTagField(newFields.rowIndex);
      MarcAuthorityBrowse.checkSearchOptions();
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.searchByParameter(newFields.searchOption, newFields.marcValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(newFields.rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        newFields.rowIndex,
        newFields.tag,
        '\\',
        '\\',
        `${newFields.boxFourth}`,
        `${newFields.boxFifth}`,
        `${newFields.boxSixth}`,
        `${newFields.boxSeventh}`,
      );

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyRecordAndMarcAuthIcon(
        testData.accordion,
        `${testData.marcAuthIcon}\n${newFields.marcValue}`,
      );
      InventoryInstance.getId().then((id) => {
        createdAuthorityIDs.push(id);
      });
      cy.logout();

      cy.login(testData.userBData.username, testData.userBData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle(testData.fieldContents.tag245Content);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        newFields.rowIndex,
        newFields.tag,
        '\\',
        '\\',
        `${newFields.boxFourth}`,
        `${newFields.boxFifth}`,
        `${newFields.boxSixth}`,
        `${newFields.boxSeventh}`,
      );
    },
  );
});
