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
      const fileName = `C360521 testMarcFile.${getRandomPostfix()}.mrc`;
      const createdAuthorityIDs = [];

      before('Creating data', () => {
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

      after('Deleting data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        createdAuthorityIDs.length = 0;
      });

      it(
        'C360521 Import of "MARC Authority" record with valid prefix in "010 $a" field only (spitfire)',
        { tags: ['smoke', 'authority', 'spitfire', 'shiftLeft', 'C360521'] },
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
          Logs.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, 'Completed');
          Logs.openFileDetails(fileName);
          Logs.goToTitleLink('Apple Academic Press');
          cy.wait(1000);
          Logs.checkAuthorityLogJSON([
            '"sourceFileId":',
            '"af045f2f-e851-4613-984c-4bc13430454a"',
            '"naturalId":',
            '"n2015002050"',
          ]);
        },
      );
    });
  });
});
