import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  const testData = {
    tag830: '830',
    instanceField830Value: 'C380468 Cornell University Library historical math monographs',
    errorMessage:
      'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
  };

  const linkValuesWithoutAuthoritySource = [
    {
      value: 'C380468 Stone, Robert B.',
      searchOption: 'Personal name',
    },
    {
      value: 'C380468 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      searchOption: 'Name-title',
    },
    {
      value: 'C380468 Catalonia (Spain). Mozos de Escuadra',
      searchOption: 'Corporate/Conference name',
    },
    {
      value: 'C380468 United States. Truth in Lending Act',
      searchOption: 'Name-title',
    },
    {
      value: 'C380468 Western Region Research Conference in Agricultural Education',
      searchOption: 'Corporate/Conference name',
    },
    {
      value:
        'C380468 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
      searchOption: 'Name-title',
    },
  ];

  const linkValuesWithAuthoritySource = [
    {
      value: 'C380468 Montessori method of education',
      searchOption: 'Subject',
      authoritySource: String.raw`LC Children's Subject Headings`,
    },
    {
      value: 'C380468 Gulf Stream',
      searchOption: 'Geographic name',
      authoritySource: 'LC Subject Headings (LCSH)',
    },
    {
      value: 'C380468 Peplum films',
      searchOption: 'Genre',
      authoritySource: 'LC Genre/Form Terms (LCGFT)',
    },
  ];

  const marcFiles = [
    {
      marc: 'marcBibFileForC380468.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC380468.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 10,
    },
  ];

  const bib830FieldValues = [
    22,
    testData.tag830,
    '\\',
    '0',
    '$a C380468 Cornell University Library historical math monographs',
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
    'C380468 Verify that user cant link "830" MARC Bib field with wrong record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib830FieldValues);
      InventoryInstance.verifyAndClickLinkIconByIndex(bib830FieldValues[0]);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.checkSearchOption('uniformTitle');
      MarcAuthorities.checkSearchInput(testData.instanceField830Value);
      MarcAuthorities.verifyEmptyAuthorityField();
      linkValuesWithoutAuthoritySource.forEach((linkValue) => {
        MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
        MarcAuthorities.checkRow(linkValue.value);
        MarcAuthorities.selectTitle(linkValue.value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.checkCallout(testData.errorMessage);
        InventoryInstance.verifySelectMarcAuthorityModal();
      });

      linkValuesWithAuthoritySource.forEach((linkValue) => {
        MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
        MarcAuthorities.chooseAuthoritySourceOption(linkValue.authoritySource);
        MarcAuthorities.selectTitle(linkValue.value);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.checkCallout(testData.errorMessage);
        InventoryInstance.verifySelectMarcAuthorityModal();
        MarcAuthorities.closeAuthoritySourceOption();
      });
    },
  );
});
