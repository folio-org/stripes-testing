import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag001: '001',
    tag010: '010',
    tag100: '100',
    tag155: '155',
    tag655: '655',
    tag700: '700',
    subfieldZValue: 'n12345',
    updatedSubfieldZValue: 'n12345678910',
    updated155FieldValue: 'Drama C374159 cinema',
    updated010FieldValue: 'gf20140262973741590',
    autoUpdateUserName: 'Automated linking update',
    subjectAccordion: 'Subject',
    authorityIconText: 'Linked to MARC authority'
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC376596.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'The coronation of Queen Elizabeth II C376596'
    },
    {
      marc: 'marcBibFileC374159.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'Titanic / written and directed by James Cameron. C374159'
    },
    {
      marc: 'marcAuthFileC376596.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Elizabeth C376596',
      authority010FieldValue: 'n80126296376596',
    },
    {
      marc: 'marcAuthFileC374159.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Drama C374159',
      authority010FieldValue: 'gf2014026297374159',
      authority555FieldValue: 'Literature C374159'
    }
  ];

  const createdRecordIDs = [];

  before('Creating user, importing and linking records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach(marcFile => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then(link => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(marcFiles[2].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(testData.tag010, `‡a ${marcFiles[2].authority010FieldValue}`);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        InventoryInstance.searchByTitle(createdRecordIDs[1]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag655);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(marcFiles[3].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(testData.tag010, `‡a ${marcFiles[3].authority010FieldValue}`);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag655);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.marcAuthorities, waiter: MarcAuthorities.waitLoading });
  });

  after('Deleting user, data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index > 1) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    for (let i = 0; i < marcFiles.length; i++) {
      DataImport.selectLog(i);
    }
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();
  });

  it('C376596 Add/Edit/Delete "$z" subfield in "010" field of linked "MARC authority" record when "010" = "$0" (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy('Keyword', marcFiles[2].authorityHeading);
    MarcAuthorities.selectTitle(marcFiles[2].authorityHeading);
    MarcAuthority.edit();
    QuickMarcEditor.checkContent(`$a ${marcFiles[2].authority010FieldValue}`, 4);
    QuickMarcEditor.updateExistingField(testData.tag010, `$a ${marcFiles[2].authority010FieldValue} $z ${testData.subfieldZValue}`);
    QuickMarcEditor.checkButtonsEnabled();
    QuickMarcEditor.clickSaveAndKeepEditing();
    QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
    QuickMarcEditor.updateExistingField(testData.tag010, `$a ${marcFiles[2].authority010FieldValue} $z ${testData.updatedSubfieldZValue}`);
    QuickMarcEditor.checkButtonsEnabled();
    QuickMarcEditor.clickSaveAndKeepEditing();
    QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
    QuickMarcEditor.updateExistingField(testData.tag010, `$a ${marcFiles[2].authority010FieldValue}`);
    QuickMarcEditor.checkButtonsEnabled();
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();

    MarcAuthorities.searchBy('Keyword', marcFiles[2].authorityHeading);
    MarcAuthorities.verifyNumberOfTitles(4, '1');
    MarcAuthorities.clickOnNumberOfTitlesLink(4, '1');

    InventoryInstance.editMarcBibliographicRecord();
    QuickMarcEditor.verifyTagFieldAfterLinking(60, testData.tag700, '0', '\\',
      `$a ${marcFiles[2].authorityHeading}`, '', `$0 id.loc.gov/authorities/names/${marcFiles[2].authority010FieldValue}`, '');
  });

  it('C374159 Edit values in "1XX" and "010" fields of linked "MARC Authority" record when "$0" = "010 $a" (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy('Keyword', marcFiles[3].authority555FieldValue);
    MarcAuthorities.selectTitle(marcFiles[3].authority555FieldValue);
    MarcAuthority.edit();
    QuickMarcEditor.updateExistingField(testData.tag155, `$a ${testData.updated155FieldValue}`);
    QuickMarcEditor.checkButtonsEnabled();
    QuickMarcEditor.updateExistingField(testData.tag010, `$a ${testData.updated010FieldValue}`);
    QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
    QuickMarcEditor.confirmUpdateLinkedBibs(1);
    MarcAuthorities.searchBy('Keyword', testData.updated155FieldValue);
    MarcAuthorities.checkResultList([testData.updated155FieldValue]);
    MarcAuthorities.verifyNumberOfTitles(4, '1');
    MarcAuthorities.clickOnNumberOfTitlesLink(4, '1');

    InventoryInstance.checkInstanceTitle(marcFiles[1].instanceTitle);
    InventoryInstance.verifyRecordStatus(testData.autoUpdateUserName);
    InventoryInstance.verifyInstanceSubject(11, 0, `${testData.authorityIconText}${testData.updated155FieldValue}`);
    InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.subjectAccordion);

    InventoryInstance.editMarcBibliographicRecord();
    QuickMarcEditor.checkPaneheaderContains(`Source: ${testData.autoUpdateUserName}`);
    QuickMarcEditor.verifyTagFieldAfterLinking(52, '655', '\\', '7', `$a ${testData.updated155FieldValue}`, '', `$0 id.loc.gov/authorities/genreForms/${testData.updated010FieldValue}`, '$2 fast');
  });
});

