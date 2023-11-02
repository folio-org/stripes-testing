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
import Parallelization from '../../../support/dictionary/parallelization';

describe('plug-in MARC authority | Search', () => {
  const testData = {
    forC359232: {
      searchOption: 'Subject',
      typeOfHeading: 'Topical',
      value: 'Inventors',
      typeA: 'Authorized',
      typeB: 'Reference',
      typeC: 'Auth/Ref',
    },
  };

  const marcFiles = [
    {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcFileForC359232.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 64,
    },
  ];

  const createdAuthorityIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
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
          },
        );
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    for (let i = 1; i < 65; i++) {
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
    }
  });

  it(
    'C380571 MARC Authority plug-in | Search using "Subject" option (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon('700');
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      MarcAuthorities.searchByParameter(testData.forC359232.searchOption, '*');
      // wait for the results to be loaded.
      cy.wait(1000);
      MarcAuthorities.checkSingleHeadingType(
        testData.forC359232.typeA,
        testData.forC359232.typeOfHeading,
      );
      MarcAuthorities.checkType(
        testData.forC359232.typeA,
        testData.forC359232.typeB,
        testData.forC359232.typeC,
      );
      MarcAuthorities.clickNextPagination();
      MarcAuthorities.checkSingleHeadingType(
        testData.forC359232.typeA,
        testData.forC359232.typeOfHeading,
      );
      MarcAuthorities.searchByParameter(
        testData.forC359232.searchOption,
        testData.forC359232.value,
      );
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.forC359232.value);
      InventoryInstance.closeDetailsView();
    },
  );
});
