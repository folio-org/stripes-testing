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
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Manual linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: 'The Book of books',
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    errorMessage:
      'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
  };

  const newFields = [
    {
      rowIndex: 4,
      tag: '100',
      content: '$a test123',
      marcValue: 'C380730 John Bartholomew and Son. Bartholomew world travel series 1995 English',
      searchOption: 'Name-title',
    },
    {
      rowIndex: 5,
      tag: '240',
      content: '$a test123',
      marcValue: 'C380730 Jackson, Peter, 1950-2022 Inspector Banks series ;',
      searchOption: 'Personal name',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380730.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 2,
    },
  ];

  const createdAuthorityIDs = [];

  before('Create user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
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
  });

  it(
    'C380730 "$t" validation when linking "MARC Bibliographic" record\'s fields upon record creation (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
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

      newFields.forEach((field) => {
        InventoryInstance.verifyAndClickLinkIcon(field.tag);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorityBrowse.checkSearchOptions();
        MarcAuthorities.clickReset();
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.searchByParameter(field.searchOption, field.marcValue);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.checkCallout(testData.errorMessage);
        // wait for error message to appear
        cy.wait(1000);
        InventoryInstance.closeFindAuthorityModal();
      });
    },
  );
});
