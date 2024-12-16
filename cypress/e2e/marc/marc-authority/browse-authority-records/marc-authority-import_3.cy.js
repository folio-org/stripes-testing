import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe(
      'Browse - Authority records',
      {
        retries: {
          runMode: 1,
        },
      },
      () => {
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

        beforeEach('Creating data', () => {
          fileName = `C360522 testMarcFile.${getRandomPostfix()}.mrc`;
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
          });
        });

        afterEach('Deleting data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
          createdAuthorityIDs.length = 0;
        });

        it(
          'C360522 Import of "MARC Authority" record with same valid prefixes in "001" and "010 $a" fields (spitfire)',
          { tags: ['smoke', 'authority', 'spitfire', 'shiftLeft', 'C360522'] },
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
            Logs.waitFileIsImported(fileName);
            Logs.checkJobStatus(fileName, 'Completed');
            Logs.openFileDetails(fileName);
            Logs.goToTitleLink('Case Reports');
            cy.wait(1000);
            Logs.checkAuthorityLogJSON([
              '"sourceFileId":',
              '"6ddf21a6-bc2f-4cb0-ad96-473e1f82da23"',
              '"naturalId":',
              '"D002363"',
            ]);
          },
        );
      },
    );
  });
});
