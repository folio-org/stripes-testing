import TestTypes from '../../../../../support/dictionary/testTypes';
import DevTeams from '../../../../../support/dictionary/devTeams';
import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  const testData = {
    tag600: '600',
    instanceField600Value: '1909-1998. (Barry Morris),',
    errorMessage:
      'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
  };

  const linkValuesWithoutAuthoritySource = [
    {
      value: 'C380454 Catalonia (Spain). Mozos de Escuadra',
      searchOption: 'Corporate/Conference name',
    },
    {
      value: 'C380454 United States. Truth in Lending Act',
      searchOption: 'Name-title',
    },
    {
      value: 'C380454 Western Region Research Conference in Agricultural Education',
      searchOption: 'Corporate/Conference name',
    },
    {
      value:
        'C380454 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
      searchOption: 'Name-title',
    },
  ];

  const linkValuesWithAuthoritySource = [
    {
      value: 'C380454 Marvel comics',
      searchOption: 'Uniform title',
      authoritySource: 'LC Name Authority file (LCNAF)',
    },
    {
      value: 'C380454 Montessori method of education',
      searchOption: 'Subject',
      authoritySource: String.raw`LC Children's Subject Headings`,
    },
    {
      value: 'C380454 Gulf Stream',
      searchOption: 'Geographic name',
      authoritySource: 'LC Subject Headings (LCSH)',
    },
    {
      value: 'C380454 Peplum films',
      searchOption: 'Genre',
      authoritySource: 'LC Genre/Form Terms (LCGFT)',
    },
  ];

  const linkableValue = {
    value: 'C380454 Stone, Robert B.',
    searchOption: 'Personal name',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380454.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC380454.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 10,
    },
  ];

  const bib600FieldValues = [
    21,
    testData.tag600,
    '1',
    '0',
    '$b C380454 Goldwater, Barry M. $t (Barry Morris), $d 1909-1998.',
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
    'C380454 Verify that user cant link "600" MARC Bib field with wrong record. (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib600FieldValues);
      InventoryInstance.verifyAndClickLinkIconByIndex(bib600FieldValues[0]);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.checkSearchOption('personalNameTitle');
      MarcAuthorities.checkSearchInput(testData.instanceField600Value);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchOption('personalNameTitle');
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
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(bib600FieldValues[1], bib600FieldValues[0]);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        bib600FieldValues[0],
        bib600FieldValues[1],
        bib600FieldValues[2],
        bib600FieldValues[3],
        '$a C380454 Stone, Robert B.',
        '',
        '$0 id.loc.gov/authorities/names/n79061096',
        '',
      );
    },
  );
});
