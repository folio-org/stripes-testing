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
    tag100: '100',
    instanceField100Value: 'Coates, Ta-Nehisi, 1975-',
    authorityFieldValue: {
      field100: 'C380449 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      field110A: 'C380449 Catalonia (Spain). Mozos de Escuadra',
      field110B: 'C380449 United States. Truth in Lending Act',
      field111A: 'C380449 Western Region Research Conference in Agricultural Education',
      field111B:
        'C380449 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
      field130: 'C380449 Marvel comics',
      field150: 'C380449 Montessori method of education',
      field151: 'C380449 Gulf Stream',
      field155: 'C380449 Peplum films',
    },
    searchOptions: {
      nameTitle: 'Name-title',
      corporateName: 'Corporate/Conference name',
      uniformTitle: 'Uniform title',
      subject: 'Subject',
      geographicName: 'Geographic name',
      genre: 'Genre',
    },
    authorized: 'Authorized',
    errorMessage:
      'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
    facetOptions: {
      oprtionA: String.raw`LC Children's Subject Headings`,
      oprtionB: 'LC Subject Headings (LCSH)',
      oprtionC: 'LC Genre/Form Terms (LCGFT)',
    },
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380449.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC380449.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 10,
    },
  ];

  const bib100FieldValues = [
    33,
    testData.tag100,
    '1',
    '\\',
    '$a Coates, Ta-Nehisi, $e author. $d 1975-',
  ];

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
          DataImport.waitLoading();
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
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
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C380449 Verify that user cant link "100" MARC Bib field with wrong record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib100FieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorityBrowse.checkSearchOptions();
      MarcAuthorities.checkSearchInput(testData.instanceField100Value);
      MarcAuthorities.verifyEmptyAuthorityField();
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.nameTitle,
        testData.authorityFieldValue.field100,
      );
      MarcAuthorities.checkRow(testData.authorityFieldValue.field100);
      MarcAuthorities.selectTitle(testData.authorityFieldValue.field100);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorities.switchToBrowse();
      MarcAuthorities.verifyDisabledSearchButton();
      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.corporateName,
        testData.authorityFieldValue.field110A,
      );
      MarcAuthorities.checkRow(testData.authorityFieldValue.field110A);
      MarcAuthorities.selectTitle(testData.authorityFieldValue.field110A);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.nameTitle,
        testData.authorityFieldValue.field110B,
      );
      MarcAuthorities.checkRow(testData.authorityFieldValue.field110B);
      MarcAuthorities.selectTitle(testData.authorityFieldValue.field110B);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.corporateName,
        testData.authorityFieldValue.field111A,
      );
      MarcAuthorities.checkRow(testData.authorityFieldValue.field111A);
      MarcAuthorities.selectTitle(testData.authorityFieldValue.field111A);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.nameTitle,
        testData.authorityFieldValue.field111B,
      );
      MarcAuthorities.checkRow(testData.authorityFieldValue.field111B);
      MarcAuthorities.selectTitle(testData.authorityFieldValue.field111B);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.uniformTitle,
        testData.authorityFieldValue.field130,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.subject,
        testData.authorityFieldValue.field150,
      );
      MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.oprtionA);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.geographicName,
        testData.authorityFieldValue.field151,
      );
      MarcAuthorities.closeAuthoritySourceOption();
      MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.oprtionB);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();

      MarcAuthorityBrowse.searchBy(
        testData.searchOptions.genre,
        testData.authorityFieldValue.field155,
      );
      MarcAuthorities.closeAuthoritySourceOption();
      MarcAuthorities.chooseAuthoritySourceOption(testData.facetOptions.oprtionC);
      MarcAuthorities.checkRow(testData.authorityFieldValue.field155);
      MarcAuthorities.selectTitle(testData.authorityFieldValue.field155);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      InventoryInstance.verifySelectMarcAuthorityModal();
    },
  );
});
