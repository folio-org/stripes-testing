import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

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
        const { user, memberTenant } = parseSanityParameters();

        const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
        const propertyName = 'authority';
        let fileName;
        const createdAuthorityIDs = [];

        beforeEach('Creating data', () => {
          fileName = `C360522 testMarcFile.${getRandomPostfix()}.mrc`;

          cy.setTenant(memberTenant.id);
          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
            authRefresh: true,
          });
          cy.allure().logCommandSteps();
        });

        afterEach('Deleting data', () => {
          cy.allure().logCommandSteps(false);
          cy.getUserToken(user.username, user.password);
          cy.allure().logCommandSteps();
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
          createdAuthorityIDs.length = 0;
        });

        it(
          'C360522 Import of "MARC Authority" record with same valid prefixes in "001" and "010 $a" fields (spitfire)',
          { tags: ['dryRun', 'spitfire', 'C360522'] },
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
            cy.wait(1500);
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
