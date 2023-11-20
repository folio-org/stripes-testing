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
    tag240: '240',
    instanceField240Value: 'C380453 Laws, etc. 1995 Fish and Game Code',
    errorMessage:
      'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
  };

  const linkValuesWithoutAuthoritySource = [
    {
      value: 'C380453 Stone, Robert B.',
      searchOption: 'Personal name',
    },
    {
      value: 'C380453 Catalonia (Spain). Mozos de Escuadra',
      searchOption: 'Corporate/Conference name',
    },
    {
      value: 'C380453 Western Region Research Conference in Agricultural Education',
      searchOption: 'Corporate/Conference name',
    },
  ];

  const linkValuesWithAuthoritySource = [
    {
      value: 'C380453 Marvel comics',
      searchOption: 'Uniform title',
      authoritySource: 'LC Name Authority file (LCNAF)',
    },
    {
      value: 'C380453 Montessori method of education',
      searchOption: 'Subject',
      authoritySource: String.raw`LC Children's Subject Headings`,
    },
    {
      value: 'C380453 Gulf Stream',
      searchOption: 'Geographic name',
      authoritySource: 'LC Subject Headings (LCSH)',
    },
    {
      value: 'C380453 Peplum films',
      searchOption: 'Genre',
      authoritySource: 'LC Genre/Form Terms (LCGFT)',
    },
  ];

  const marcFiles = [
    {
      marc: 'marcBibFileForC380453.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForCC380453.mrc',
      fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 10,
    },
  ];

  const bib240FieldValues = [
    11,
    testData.tag240,
    '1',
    '0',
    '$a C380453 Laws, etc. $d 1995 $t Fish and Game Code $p test $2 ptf',
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
    'C380453 Verify that user cant link "240" MARC Bib field with wrong record. (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240FieldValues);
      InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.checkSearchOption('nameTitle');
      MarcAuthorities.checkSearchInput(testData.instanceField240Value);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.checkSearchOption('nameTitle');
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
    },
  );
});
