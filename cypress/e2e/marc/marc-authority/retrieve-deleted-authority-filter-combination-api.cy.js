/* eslint-disable no-unused-vars */
import {
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_FOLIO_AUTHORITY_FILES,
  DEFAULT_LOCALE_STRING,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOption: 'Keyword',
      tag010: '010',
      authorityHeadings: [
        'Kerouac, Jack C432323Auto',
        'Apple & Honey Productions C432323Auto',
        "Association pour la promotion et la protection de la liberté d'expression au Burundi C432323Auto",
        'Apple Academic Press C432323Auto',
        'Western Region Research Conference in Agricultural Education C432323Auto',
      ],
      correspondingSourceFileNames: [
        DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
        DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
      ],
      correspondingTypesOfHeadings: [
        'Personal Name',
        'Corporate Name',
        'Corporate Name',
        'Corporate Name',
        'Conference Name',
      ],
      localeConfigName: 'localeSettings',
    };

    const firstRecordToDelete = {
      heading: testData.authorityHeadings[1],
    };

    const marcFile = {
      marc: 'marcAuthFileC432323.mrc',
      fileName: `testMarcFileC432323.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      propertyName: 'authority',
    };

    const createdRecordIDs = [];

    let firstDeleteTime;
    let batchDeleteStart;
    let batchDeleteEnd;

    before('Creating user and data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('*C432323Auto');

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });

        // set tenant locale to default (with UTC time)
        cy.getConfigForTenantByName(testData.localeConfigName).then((config) => {
          const updatedConfig = { ...config };
          updatedConfig.value = DEFAULT_LOCALE_STRING;
          cy.updateConfigForTenantById(config.id, updatedConfig);
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      // attempt to delete all authorities just in case deletion failed in test
      createdRecordIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
    });

    it(
      'C432323 Retrieve UUIDs of deleted MARC authority records using filters combination via API (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        MarcAuthoritiesSearch.searchBy(testData.searchOption, firstRecordToDelete.heading);
        MarcAuthorities.selectTitle(firstRecordToDelete.heading);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.verifyDeleteComplete(firstRecordToDelete.heading);
        firstDeleteTime = new Date().toISOString().slice(0, 19);

        // wait at least 3 mins before deleting the rest of the records, as per test case
        // cy.wait(3.1 * 60 * 1000);

        batchDeleteStart = new Date().toISOString().slice(0, 19);
        testData.authorityHeadings
          .filter((heading) => heading !== firstRecordToDelete.heading)
          .forEach((heading) => {
            MarcAuthoritiesSearch.searchBy(testData.searchOption, heading);
            MarcAuthorities.selectTitle(heading);
            MarcAuthoritiesDelete.clickDeleteButton();
            MarcAuthoritiesDelete.checkDeleteModal();
            MarcAuthoritiesDelete.confirmDelete();
            MarcAuthoritiesDelete.verifyDeleteComplete(heading);
          });
        batchDeleteEnd = new Date().toISOString().slice(0, 19);

        // testData.sourceFileNames.forEach((sourceFileName, index) => {
        //   MarcAuthority.getRecordsViaAPI(
        //     true,
        //     true,
        //     'text/plain',
        //     `authoritySourceFile.name="${sourceFileName}"`,
        //   ).then((body) => {
        //     const records = body.split('\n');
        //     createdRecordIDs.forEach((id, idx) => {
        //       if (idx === index) expect(records.filter((record) => record === id).length).to.equal(1);
        //       else expect(records.filter((record) => record === id).length).to.equal(0);
        //     });
        //   });
        // });

        // MarcAuthority.getRecordsViaAPI(
        //   true,
        //   true,
        //   null,
        //   'cql.allRecords=1 NOT authoritySourceFile.name=""',
        // ).then((body) => {
        //   createdRecordIDs.forEach((id, index) => {
        //     if (index === createdRecordIDs.length - 2) expect(body.authorities.filter((record) => record.id === id).length).to.equal(1);
        //     else expect(body.authorities.filter((record) => record.id === id).length).to.equal(0);
        //   });
        // });

        // MarcAuthority.getRecordsViaAPI(
        //   true,
        //   true,
        //   'text/plain',
        //   `authoritySourceFile.name="${testData.localSourceName}"`,
        // ).then((body) => {
        //   const records = body.split('\n');
        //   createdRecordIDs.forEach((id, index) => {
        //     if (index === createdRecordIDs.length - 1) expect(records.filter((record) => record === id).length).to.equal(1);
        //     else expect(records.filter((record) => record === id).length).to.equal(0);
        //   });
        // });

        // MarcAuthority.getRecordsViaAPI(
        //   true,
        //   true,
        //   'text/plain',
        //   `(authoritySourceFile.name="${testData.sourceFileNames[0]}") or (authoritySourceFile.name="${testData.sourceFileNames[1]}") or (authoritySourceFile.name="${testData.sourceFileNames[3]}")`,
        // ).then((body) => {
        //   const records = body.split('\n');
        //   createdRecordIDs.forEach((id, index) => {
        //     if (index === 0 || index === 1 || index === 3) expect(records.filter((record) => record === id).length).to.equal(1);
        //     else expect(records.filter((record) => record === id).length).to.equal(0);
        //   });
        // });
      },
    );
  });
});
