import TopMenu from '../../../support/fragments/topMenu';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import getRandomPostfix from '../../../support/utils/stringTools';
import Logs from '../../../support/fragments/data_import/logs/logs';

describe('fse-marc-authority - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195332 - verify that marc authority page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'marc-authorities'] },
    () => {
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthorities.waitLoading();
    },
  );
});

describe('fse-marc-authority - UI for non-production tenants', () => {
  const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
  const propertyName = 'authority';
  let fileName;
  const createdAuthorityIDs = [];

  beforeEach('Creating data', () => {
    fileName = `TC195688 testMarcFile.${getRandomPostfix()}.mrc`;
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    });
  });

  afterEach('Deleting data', () => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    cy.allure().logCommandSteps();
    createdAuthorityIDs.length = 0;
  });

  it(
    `TC195688 - check import of "MARC Authority" record ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'marc-authorities', 'data-import'] },
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
