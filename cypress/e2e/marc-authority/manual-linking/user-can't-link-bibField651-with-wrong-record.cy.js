import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcAuthorityBrowse from '../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  const testData = {
    tag651: '651',
    errorMessage:
      'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
  };

  const linkValuesWithoutAuthoritySource = [
    {
      value: 'C380459 Stone, Robert B.',
      searchOption: 'Personal name',
    },
    {
      value: 'C380459 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      searchOption: 'Name-title',
    },
    {
      value: 'C380459 Catalonia (Spain). Mozos de Escuadra',
      searchOption: 'Corporate/Conference name',
    },
    {
      value: 'C380459 United States. Truth in Lending Act',
      searchOption: 'Name-title',
    },
    {
      value: 'C380459 Western Region Research Conference in Agricultural Education',
      searchOption: 'Corporate/Conference name',
    },
    {
      value:
        'C380459 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
      searchOption: 'Name-title',
    },
  ];

  const linkValuesWithAuthoritySource = [
    {
      value: 'C380459 Marvel comics',
      searchOption: 'Uniform title',
      authoritySource: 'LC Name Authority file (LCNAF)',
    },
    {
      value: 'C380459 Montessori method of education',
      searchOption: 'Subject',
      authoritySource: String.raw`LC Children's Subject Headings`,
    },
    {
      value: 'C380459 Peplum films',
      searchOption: 'Genre',
      authoritySource: 'LC Genre/Form Terms (LCGFT)',
    },
  ];

  const linkableValue = {
    value: 'C380459 Gulf Stream',
    searchOption: 'Geographic name',
    authoritySource: 'LC Subject Headings (LCSH)',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380459.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC380459.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 10,
    },
  ];

  const bib651FieldValues = [20, testData.tag651, '\\', '0', '$e C380459 Clear Creek  $4 (Tex.)'];

  const createdRecordIDs = [];

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
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          }
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
    'C380459 Verify that user cant link "651" MARC Bib field with wrong record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib651FieldValues);
      InventoryInstance.verifyAndClickLinkIconByIndex(bib651FieldValues[0]);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.checkSearchOption('geographicName');
      MarcAuthorities.checkSearchInput('');
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchOption('geographicName');
      MarcAuthorities.checkSearchInput('');
      MarcAuthorities.verifyEmptyAuthorityField();
      linkValuesWithoutAuthoritySource.forEach((linkValue) => {
        MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.checkCallout(testData.errorMessage);
        InventoryInstance.verifySelectMarcAuthorityModal();
      });

      linkValuesWithAuthoritySource.forEach((linkValue) => {
        MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
        MarcAuthorities.chooseAuthoritySourceOption(linkValue.authoritySource);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.checkCallout(testData.errorMessage);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.closeAuthoritySourceOption();
      });

      MarcAuthorityBrowse.searchBy(linkableValue.searchOption, linkableValue.value);
      MarcAuthorities.chooseAuthoritySourceOption(linkableValue.authoritySource);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(bib651FieldValues[1], bib651FieldValues[0]);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        bib651FieldValues[0],
        bib651FieldValues[1],
        bib651FieldValues[2],
        bib651FieldValues[3],
        '$a C380459 Gulf Stream',
        '$e C380459 Clear Creek',
        '$0 id.loc.gov/authorities/subjects/sh85057894',
        '$4 (Tex.)',
      );
    },
  );
});
