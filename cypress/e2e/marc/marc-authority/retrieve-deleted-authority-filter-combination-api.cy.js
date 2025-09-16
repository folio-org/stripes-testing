import {
  DEFAULT_JOB_PROFILE_NAMES,
  DEFAULT_FOLIO_AUTHORITY_FILES,
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
      authorityHeadings: [
        'Kerouac, Jack C432323Auto',
        'Apple & Honey Productions C432323Auto',
        'Association pour la promotion et la protection de la liberté d expression au Burundi C432323Auto',
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

    let createTime;
    let batchDeleteStart;

    before('Creating user and data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('*C432323Auto');

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        createTime = new Date().toISOString().slice(0, 19);

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
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
      { tags: ['criticalPath', 'spitfire', 'C432323'] },
      () => {
        MarcAuthorities.getMarcAuthoritiesViaApi({
          query: `(keyword == "${firstRecordToDelete.heading}" or keyword == "${testData.authorityHeadings[0]}")`,
        }).then((records) => {
          const unmatchedRecordIds = records.map((rec) => rec.id);

          MarcAuthoritiesSearch.searchBy(testData.searchOption, firstRecordToDelete.heading);
          MarcAuthorities.selectTitle(firstRecordToDelete.heading);
          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.verifyDeleteComplete(firstRecordToDelete.heading);

          // wait at least 3 mins before deleting the rest of the records, as per test case
          cy.wait(3.1 * 60 * 1000);

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
          batchDeleteStart = new Date();
          batchDeleteStart.setMinutes(batchDeleteStart.getMinutes() + 2);
          batchDeleteStart = batchDeleteStart.toISOString().slice(0, 19);
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

          cy.getAdminToken();
          MarcAuthority.getRecordsViaAPI(
            true,
            true,
            'text/plain',
            `((createdDate >= ${createTime}) and (updatedDate >= ${batchDeleteStart})) and ((headingType=corporateName) or (headingType=meetingName)) and ((authoritySourceFile.name="${testData.correspondingSourceFileNames[2]}") or (authoritySourceFile.name="${testData.correspondingSourceFileNames[3]}"))`,
          ).then((body) => {
            cy.log(unmatchedRecordIds);
            const deletedRecords = body.split('\n');
            createdRecordIDs.forEach((id) => {
              if (!unmatchedRecordIds.includes(id)) expect(deletedRecords.filter((record) => record === id).length).to.equal(1);
              else expect(deletedRecords.filter((record) => record === id).length).to.equal(0);
            });
          });
        });
      },
    );
  });
});
