import {
  DEFAULT_JOB_PROFILE_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  RECORD_STATUSES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Data Import', () => {
  describe('MARC Authority', () => {
    describe('Importing MARC Authority files', () => {
      const { user, memberTenant } = parseSanityParameters();

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const propertyName = 'authority';
      let fileName;
      const createdAuthorityIDs = [];

      beforeEach('Creating data', () => {
        fileName = `C350668 testMarcFile.${getRandomPostfix()}.mrc`;

        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        cy.allure().logCommandSteps();
      });

      afterEach('Deleting data', () => {
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        createdAuthorityIDs.length = 0;
      });

      it(
        'C350666 Create a MARC authority record via data import (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C360522'] },
        () => {
          DataImport.uploadFileViaApi('test-auth-file.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );
          Logs.waitFileIsImported(fileName);
          Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(fileName);
          Logs.goToTitleLink(RECORD_STATUSES.CREATED);
          MarcAuthority.contains(ACCEPTED_DATA_TYPE_NAMES.MARC);
        },
      );
    });
  });
});
