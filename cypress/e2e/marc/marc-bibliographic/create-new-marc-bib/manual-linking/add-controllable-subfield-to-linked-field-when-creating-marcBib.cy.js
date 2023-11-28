import TestTypes from '../../../../../support/dictionary/testTypes';
import DevTeams from '../../../../../support/dictionary/devTeams';
import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

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
    accordion: 'Subject',
    fieldName: {
      fifthBox: (rowIndex) => {
        return `records[${rowIndex}].subfieldGroups.uncontrolledAlpha`;
      },
      seventhBox: (rowIndex) => {
        return `records[${rowIndex}].subfieldGroups.uncontrolledNumber`;
      },
    },
    errorMessage: (tag) => {
      return `MARC ${tag} has a subfield(s) that cannot be saved because the field is controlled by an authority record.`;
    },
  };

  const newFields = [
    {
      rowIndex: 5,
      tag: '100',
      content: '$a test123',
      boxFourth: '$a C380745 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
      boxFifth: '',
      boxSixth: '$0 3052044',
      boxSeventh: '',
      searchOption: 'Personal name',
      marcValue: 'C380745 Jackson, Peter, 1950-2022 Inspector Banks series ;',
    },
    {
      rowIndex: 6,
      tag: '611',
      content: '$a test123',
      boxFourth: '$a C380745 Mostly Chopin Festival. $e Orchestra $t sonet',
      boxFifth: '',
      boxSixth: '$0 997404',
      boxSeventh: '',
      searchOption: 'Name-title',
      marcValue: 'C380745 Mostly Chopin Festival. sonet',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcAuthFileForC380745.mrc',
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

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C380745 Add controllable subfields to a linked field when creating "MARC Bibliographic" record (spitfire) (TaaS)',
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

      QuickMarcEditor.fillEmptyTextAreaOfField(5, testData.fieldName.fifthBox(5), '$a test');
      QuickMarcEditor.fillEmptyTextAreaOfField(5, testData.fieldName.seventhBox(5), '$b test');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessage(newFields[0].tag));

      QuickMarcEditor.fillEmptyTextAreaOfField(5, testData.fieldName.fifthBox(5), '');
      QuickMarcEditor.fillEmptyTextAreaOfField(5, testData.fieldName.seventhBox(5), '');
      QuickMarcEditor.fillEmptyTextAreaOfField(6, testData.fieldName.fifthBox(6), '$c test');
      QuickMarcEditor.fillEmptyTextAreaOfField(6, testData.fieldName.seventhBox(6), '$f test');
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessage(newFields[1].tag));
    },
  );
});
