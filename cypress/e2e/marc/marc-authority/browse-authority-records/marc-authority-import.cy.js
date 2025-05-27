import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
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
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const propertyName = 'authority';
      let fileName;
      const createdAuthorityIDs = [];

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Angelou, Maya');
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Twain, Mark, 1835-1910');
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C356765');
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C353995');
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
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
      });

      afterEach(() => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        createdAuthorityIDs.length = 0;
      });

      it(
        'C360520 Import of "MARC Authority" record with valid prefix in "001" field only (spitfire)',
        {
          tags: ['smoke', 'authority', 'spitfire'],
        },
        () => {
          DataImport.uploadFileViaApi('marcFileForC360520.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );
          JobProfiles.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, 'Completed');
          Logs.openFileDetails(fileName);
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
        { tags: ['smoke', 'authority', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi(
            'corporate_name(prefix_in_010Sa)sc_02.mrc',
            fileName,
            jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[propertyName].id);
            });
          });
          JobProfiles.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, 'Completed');
          Logs.openFileDetails(fileName);
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
        { tags: ['smoke', 'authority', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi(
            'D_genre(prefixes_in_001_010Sa)sc_03.mrc',
            fileName,
            jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[propertyName].id);
            });
          });
          JobProfiles.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, 'Completed');
          Logs.openFileDetails(fileName);
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
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi('marcFileForC353997.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );

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
          MarcAuthorityBrowse.searchByChangingValue(
            testData.searchOptionNameTitle,
            testData.recordA,
          );
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
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi('marcFileForC356766.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.searchBy(
            testData.searchOptionPersonalName,
            testData.recordWithoutTitle,
          );
          MarcAuthorityBrowse.checkResultWithValue(
            testData.authorized,
            testData.recordWithoutTitle,
          );
          MarcAuthorityBrowse.searchByChangingParameter(
            testData.searchOptionNameTitle,
            testData.recordWithoutTitle,
          );
          MarcAuthorityBrowse.checkResultWithNoValue(testData.recordWithoutTitle);
        },
      );

      it(
        'C356765 Search for record without subfield "t" (personalNameTitle and sftPersonalName) (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi('marcFileForC356765.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.actionsSortBy('Type of heading');

          MarcAuthorities.checkSearchOption('keyword');
          MarcAuthorities.searchByParameter('Keyword', 'C356765 Twain');
          MarcAuthorities.checkResultList([
            'C356765 Twain, Marek, 1835-1910',
            'C356765 Twain, Mark, 1835-1910',
          ]);

          MarcAuthorities.searchByParameter('Personal name', 'C356765 Twain');
          MarcAuthorities.checkResultList([
            'C356765 Twain, Marek, 1835-1910',
            'C356765 Twain, Mark, 1835-1910',
          ]);

          MarcAuthorities.searchByParameter('Name-title', 'C356765 Twain');
          MarcAuthorities.checkNoResultsMessage(
            'No results found for "C356765 Twain". Please check your spelling and filters.',
          );
        },
      );

      it(
        'C353995 Search for records which have subfield "t" value (personalNameTitle and sftPersonalNameTitle) (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi('marcFileForC353995.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.checkSearchOption('keyword');
          MarcAuthorities.searchByParameter(
            testData.searchOptionKeyword,
            `C353995 ${testData.recordB}`,
          );
          MarcAuthorityBrowse.checkResultWithValue(
            testData.authorized,
            `C353995 ${testData.recordB}`,
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionKeyword,
            `C353995 ${testData.recordA}`,
          );

          MarcAuthorityBrowse.checkResultWithValueB(
            testData.authorized,
            `C353995 ${testData.recordB}`,
            testData.reference,
            `C353995 ${testData.recordBRef}`,
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionPersonalName,
            `C353995 ${testData.recordA}`,
          );
          MarcAuthorities.checkNoResultsMessage(
            'No results found for "C353995 Angelou, Maya.". Please check your spelling and filters.',
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionNameTitle,
            `C353995 ${testData.recordB}`,
          );
          MarcAuthorityBrowse.checkResultWithValue(
            testData.authorized,
            `C353995 ${testData.recordB}`,
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionNameTitle,
            `C353995 ${testData.recordA}`,
          );
          MarcAuthorityBrowse.checkResultWithValueB(
            testData.authorized,
            `C353995 ${testData.recordB}`,
            testData.reference,
            `C353995 ${testData.recordBRef}`,
          );
        },
      );
    });
  });
});
