import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag655: '655',
    authorityValue: 'C380766 Drama Genre',
    authorityHeading: 'C380766 Drama',
    linkedIconText: 'Linked to MARC authority',
    accordion: 'Subject',
    searchOptionGenre: 'Genre',
    authorized: 'Authorized',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380766.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC380766.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];

  const createdRecordIDs = [];

  const bib655FieldValues = [
    52,
    testData.tag655,
    '\\',
    '7',
    '$2 fast $0 (OCoLC)fst01710451 $0 (OCoLC)fst01122346',
  ];

  const bib655AfterLinkingToAuth155 = [
    52,
    testData.tag655,
    '\\',
    '7',
    '$a C380766 Drama',
    '',
    '$0 id.loc.gov/authorities/genreForms/gf2014026297',
    '$2 fast',
  ];

  const bib655AfterUnlinking = [
    52,
    testData.tag655,
    '\\',
    '7',
    '$a C380766 Drama $0 id.loc.gov/authorities/genreForms/gf2014026297 $2 fast',
  ];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdRecordIDs.push(link.split('/')[5]);
          });
        });
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C380766 Link the "655" of "MARC Bib" field with "155" field of "MARC Authority" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib655FieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag655);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchInput(
        'identifiers.value==(OCoLC)fst01710451 or identifiers.value==(OCoLC)fst01122346',
      );
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthoritiesDelete.checkEmptySearchResults(
        'identifiers.value==(OCoLC)fst01710451 or identifiers.value==(OCoLC)fst01122346',
      );
      MarcAuthorities.closeAuthorityLinkingModal();

      QuickMarcEditor.updateExistingField(testData.tag655, '$2 fast $0 (OCoLC)fst01710451');
      InventoryInstance.verifyAndClickLinkIcon(testData.tag655);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchInput('identifiers.value==(OCoLC)fst01710451');
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthoritiesDelete.checkEmptySearchResults('identifiers.value==(OCoLC)fst01710451');

      MarcAuthorities.switchToBrowse();
      MarcAuthorities.verifyDisabledSearchButton();
      MarcAuthorityBrowse.searchBy(testData.searchOptionGenre, testData.authorityValue);
      MarcAuthorities.checkRow(testData.authorityValue);
      MarcAuthorities.selectTitle(testData.authorityValue);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag655, bib655FieldValues[0]);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib655AfterLinkingToAuth155);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      InventoryInstance.verifyRecordAndMarcAuthIcon(
        testData.accordion,
        `${testData.linkedIconText}\n${testData.authorityHeading}`,
      );
      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkDetailViewIncludesText(testData.authorityValue);
      InventoryInstance.goToPreviousPage();
      // Wait for the content to be loaded.
      cy.wait(6000);
      InventoryInstance.waitLoading();
      InventoryInstance.viewSource();
      InventoryViewSource.contains(`${testData.linkedIconText}\n\t655`);
      InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
      InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
      MarcAuthorities.checkDetailViewIncludesText(testData.authorityValue);
      InventoryInstance.goToPreviousPage();
      // Wait for the content to be loaded.
      cy.wait(6000);
      InventoryViewSource.waitLoading();
      InventoryViewSource.close();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib655AfterLinkingToAuth155);

      QuickMarcEditor.clickUnlinkIconInTagField(bib655FieldValues[0]);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib655AfterUnlinking);
      QuickMarcEditor.verifyIconsAfterUnlinking(bib655FieldValues[0]);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
