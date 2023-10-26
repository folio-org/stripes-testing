import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const fieldsToUpdate = [
    {
      rowIndex: 22,
      tag: '337',
      naturalId: '$0 n91074080C387524',
    },
    {
      rowIndex: 56,
      tag: '700',
      notMatchingNaturalId: '$0 n9107408099C387524',
      matchingNaturalId: '$0 n91074080C387524',
      emptyContent: '',
      fourthBox: '$a C387524 Roberts, Julia, $d 1967-',
      fifthBox: '$e Actor.',
      sixthBox: '$0 id.loc.gov/authorities/names/n91074080C387524',
      seventhBox: '',
      valueAfterSave: 'C387524 Roberts, Julia, 1967-',
    },
  ];

  let userData = {};

  const marcFiles = [
    {
      marc: 'marcBibFileForC387524.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC387524.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
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

  after('Deleting created users, Instances', () => {
    Users.deleteViaApi(userData.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
  });

  it(
    'C387524 "Link headings" button enabling/disabling when edit "MARC bib" (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingFieldContent(
        fieldsToUpdate[0].rowIndex,
        fieldsToUpdate[0].naturalId,
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingFieldContent(
        fieldsToUpdate[1].rowIndex,
        `${fieldsToUpdate[1].fourthBox} ${fieldsToUpdate[1].fifthBox} ${fieldsToUpdate[1].notMatchingNaturalId}`,
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 700 must be set manually by selecting the link icon.');
      QuickMarcEditor.updateExistingFieldContent(
        fieldsToUpdate[1].rowIndex,
        fieldsToUpdate[1].emptyContent,
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingFieldContent(
        fieldsToUpdate[1].rowIndex,
        `${fieldsToUpdate[1].fourthBox} ${fieldsToUpdate[1].fifthBox} ${fieldsToUpdate[1].matchingNaturalId}`,
      );
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        fieldsToUpdate[1].rowIndex,
        fieldsToUpdate[1].tag,
        '1',
        '\\',
        fieldsToUpdate[1].fourthBox,
        fieldsToUpdate[1].fifthBox,
        fieldsToUpdate[1].sixthBox,
        fieldsToUpdate[1].seventhBox,
      );
      QuickMarcEditor.deleteField(fieldsToUpdate[1].rowIndex);
      QuickMarcEditor.afterDeleteNotification(fieldsToUpdate[1].tag);
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.checkNoDeletePlaceholder();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.clickUnlinkIconInTagField(fieldsToUpdate[1].rowIndex);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        fieldsToUpdate[1].rowIndex,
        fieldsToUpdate[1].tag,
        '1',
        '\\',
        '$a C387524 Roberts, Julia, $d 1967- $e Actor. $0 n91074080C387524',
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingFieldContent(
        fieldsToUpdate[1].rowIndex,
        '$a C387524 Roberts, Julia, $d 1967- $e Actor.',
      );
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingFieldContent(
        fieldsToUpdate[1].rowIndex,
        '$a C387524 Roberts, Julia, $d 1967- $e Actor. $0 id.loc.gov/authorities/names/n91074080C387524',
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingTagValue(fieldsToUpdate[1].rowIndex, '701');
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.updateExistingTagValue(fieldsToUpdate[1].rowIndex, '700');
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      QuickMarcEditor.verifyTagFieldAfterLinking(
        fieldsToUpdate[1].rowIndex,
        fieldsToUpdate[1].tag,
        '1',
        '\\',
        fieldsToUpdate[1].fourthBox,
        fieldsToUpdate[1].fifthBox,
        fieldsToUpdate[1].sixthBox,
        fieldsToUpdate[1].seventhBox,
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.verifyRecordAndMarcAuthIcon(
        'Contributor',
        `Linked to MARC authority\n${fieldsToUpdate[1].valueAfterSave}`,
      );
    },
  );
});
