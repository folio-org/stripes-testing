import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import Parallelization from '../../support/dictionary/parallelization';

describe('Data Import - Importing MARC Authority files', () => {
  const testData = {
    searchOptionPersonalName: 'Personal name',
    searchOptionNameTitle: 'Name-title',
    searchOptionKeyword: 'Keyword',
    recordA: 'Angelou, Maya.',
    recordB: 'Angelou, Maya. And still I rise',
    recordBRef: 'Angelou, Maya. Still I rise',
    authorized: 'Authorized',
    reference: 'Reference',
    recordWithoutTitle: 'Twain, Mark, 1835-1910',
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  let fileName;
  const createdAuthorityIDs = [];

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  beforeEach('Login to the application', () => {
    fileName = `testMarcFile.${getRandomPostfix()}.mrc`;

    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
  });

  after('Deleting data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C360520 Import of "MARC Authority" record with valid prefix in "001" field only (spitfire)',
    { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      DataImport.uploadFile('marcFileForC360520.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 1; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
      }
      Logs.goToTitleLink('Chemistry, Organic');
      Logs.checkAuthorityLogJSON([
        '"sourceFileId":',
        '"191874a0-707a-4634-928e-374ee9103225"',
        '"naturalId":',
        '"fst00853501"',
      ]);
    },
  );

  it(
    'C360521 Import of "MARC Authority" record with valid prefix in "010 $a" field only (spitfire)',
    { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire] },
    () => {
      DataImport.uploadFile('corporate_name(prefix_in_010Sa)sc_02.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 3; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
      }
      Logs.goToTitleLink('Apple Academic Press');
      Logs.checkAuthorityLogJSON([
        '"sourceFileId":',
        '"af045f2f-e851-4613-984c-4bc13430454a"',
        '"naturalId":',
        '"n2015002050"',
      ]);
    },
  );

  it(
    'C360522 Import of "MARC Authority" record with same valid prefixes in "001" and "010 $a" fields (spitfire)',
    { tags: [TestTypes.smoke, Features.authority, DevTeams.spitfire] },
    () => {
      DataImport.uploadFile('D_genre(prefixes_in_001_010Sa)sc_03.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 2; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
      }
      Logs.goToTitleLink('Case Reports');
      Logs.checkAuthorityLogJSON([
        '"sourceFileId":',
        '"6ddf21a6-bc2f-4cb0-ad96-473e1f82da23"',
        '"naturalId":',
        '"D002363"',
      ]);
    },
  );

  it(
    'C353997 Browse for records which have subfield "t" value (personalNameTitle and sftPersonalNameTitle) (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      DataImport.uploadFile('marcFileForC353997.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 1; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
      }
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.switchToBrowse();
      MarcAuthorityBrowse.searchBy(testData.searchOptionPersonalName, testData.recordA);
      MarcAuthorityBrowse.checkResultWithNoValue(testData.recordA);
      MarcAuthorityBrowse.searchBy(testData.searchOptionPersonalName, testData.recordB);
      MarcAuthorityBrowse.checkResultWithNoValue(testData.recordB);
      MarcAuthorityBrowse.searchByChangingParameter(
        testData.searchOptionNameTitle,
        testData.recordB,
      );
      MarcAuthorityBrowse.checkResultWithValueB(
        testData.authorized,
        testData.recordB,
        testData.reference,
        testData.recordBRef,
      );
      MarcAuthorityBrowse.searchByChangingValue(testData.searchOptionNameTitle, testData.recordA);
      MarcAuthorityBrowse.checkResultWithValueA(
        testData.recordA,
        testData.authorized,
        testData.recordB,
        testData.reference,
        testData.recordBRef,
      );
    },
  );

  it(
    'C356766 Browse for record without subfield "t" (personalNameTitle and sftPersonalName) (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      DataImport.uploadFile('marcFileForC356766.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 1; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
      }
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.switchToBrowse();
      MarcAuthorityBrowse.searchBy(testData.searchOptionPersonalName, testData.recordWithoutTitle);
      MarcAuthorityBrowse.checkResultWithValue(testData.authorized, testData.recordWithoutTitle);
      MarcAuthorityBrowse.searchByChangingParameter(
        testData.searchOptionNameTitle,
        testData.recordWithoutTitle,
      );
      MarcAuthorityBrowse.checkResultWithNoValue(testData.recordWithoutTitle);
    },
  );

  it(
    'C356765 Search for record without subfield "t" (personalNameTitle and sftPersonalName) (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      DataImport.uploadFile('marcFileForC356765.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID(0).then((link) => {
        createdAuthorityIDs.push(link.split('/')[5]);
      });

      cy.visit(TopMenu.marcAuthorities);

      MarcAuthorities.clickActionsButton();
      MarcAuthorities.actionsSortBy('Type of heading');

      MarcAuthorities.checkSearchOption('keyword');
      MarcAuthorities.searchByParameter('Keyword', 'Twain');
      MarcAuthorities.checkResultList(['Twain, Marek, 1835-1910', 'Twain, Mark, 1835-1910']);

      MarcAuthorities.searchByParameter('Personal name', 'Twain');
      MarcAuthorities.checkResultList(['Twain, Marek, 1835-1910', 'Twain, Mark, 1835-1910']);

      MarcAuthorities.searchByParameter('Name-title', 'Twain');
      MarcAuthorities.checkNoResultsMessage(
        'No results found for "Twain". Please check your spelling and filters.',
      );
    },
  );

  it(
    'C353995 Search for records which have subfield "t" value (personalNameTitle and sftPersonalNameTitle) (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      DataImport.uploadFile('marcFileForC353995.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      for (let i = 0; i < 1; i++) {
        Logs.getCreatedItemsID(i).then((link) => {
          createdAuthorityIDs.push(link.split('/')[5]);
        });
      }

      cy.visit(TopMenu.marcAuthorities);

      MarcAuthorities.checkSearchOption('keyword');
      MarcAuthorities.searchByParameter(testData.searchOptionKeyword, testData.recordB);
      MarcAuthorityBrowse.checkResultWithValue(testData.authorized, testData.recordB);

      MarcAuthorities.searchByParameter(testData.searchOptionKeyword, testData.recordA);
      MarcAuthorityBrowse.checkResultWithValueB(
        testData.authorized,
        testData.recordB,
        testData.reference,
        testData.recordBRef,
      );

      MarcAuthorities.searchByParameter(testData.searchOptionPersonalName, testData.recordA);
      MarcAuthorities.checkNoResultsMessage(
        'No results found for "Angelou, Maya.". Please check your spelling and filters.',
      );

      MarcAuthorities.searchByParameter(testData.searchOptionNameTitle, testData.recordB);
      MarcAuthorityBrowse.checkResultWithValue(testData.authorized, testData.recordB);

      MarcAuthorities.searchByParameter(testData.searchOptionNameTitle, testData.recordA);
      MarcAuthorityBrowse.checkResultWithValueB(
        testData.authorized,
        testData.recordB,
        testData.reference,
        testData.recordBRef,
      );
    },
  );
});
