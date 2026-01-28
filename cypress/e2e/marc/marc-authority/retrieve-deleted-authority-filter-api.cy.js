import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOption: 'Keyword',
      tag010: '010',
      authorityHeadings: [
        'Apple & Honey Productions (with "nr" in the 010 field) C432317Auto',
        'Music (for test) C432317Auto',
        'C432317Music Auto',
        'Montessori method of education C432317Auto',
        'Hymnals C432317Auto',
        'Children (for test) C432317Auto',
        'Chemistry, Organic C432317Auto',
        'Comparative Study C432317Auto',
        'Postcards (with "lcgtm" in 010) C432317Auto',
        'Rare book (for test) C432317Auto',
        'Art (for test "aatg" in 010) C432317Auto',
        'GSAFD Genre (for test) C432317Auto',
        'Stone, Robert B (not from pre-defined list) C432317Auto',
        'Chin, Staceyann (with local auth file) 1972- C432317Auto',
      ],
      sourceFileNames: [
        'LC Name Authority file (LCNAF)',
        'LC Subject Headings (LCSH)',
        "LC Children's Subject Headings",
        'LC Genre/Form Terms (LCGFT)',
        'LC Demographic Group Terms (LCFGT)',
        'LC Medium of Performance Thesaurus for Music (LCMPT)',
        'Faceted Application of Subject Terminology (FAST)',
        'Medical Subject Headings (MeSH)',
        'Thesaurus for Graphic Materials (TGM)',
        'Rare Books and Manuscripts Section (RBMS)',
        'Art & architecture thesaurus (AAT)',
        'GSAFD Genre Terms (GSAFD)',
      ],
    };

    const marcFiles = [
      {
        marc: 'marcAuthFileC432317_1.mrc',
        fileName: `testMarcFileC432317.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 13,
        propertyName: 'authority',
      },
      {
        marc: 'marcAuthFileC432317_2.mrc',
        fileName: `testMarcFileC43231.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 1,
        propertyName: 'authority',
      },
    ];

    const createdRecordIDs = [];

    before('Creating user and data', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C432317');

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.createAuthoritySourceFileViaAPI().then((source) => {
          testData.localSourceId = source.id;
          testData.localSourceCode = source.codes[0];
          testData.localSourceName = source.name;

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          // update authority record with naturalId with code for created local source file
          cy.loginAsAdmin().then(() => {
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthoritiesSearch.searchBy(
              testData.searchOption,
              testData.authorityHeadings[createdRecordIDs.length - 1],
            );
            MarcAuthorities.selectTitle(testData.authorityHeadings[createdRecordIDs.length - 1]);
            MarcAuthority.edit();
            QuickMarcEditor.updateExistingField(
              testData.tag010,
              `$a ${testData.localSourceCode}432317`,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      // attept to delete all authorities just in case deletion failed in test
      createdRecordIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
      // TO DO: remove `failOnStatusCode = false` after MODELINKS-210 is done
      cy.deleteAuthoritySourceFileViaAPI(testData.localSourceId, true);
    });

    it(
      'C432317 Retrieve UUIDs of deleted MARC authority records using "Authority file" filter via API (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C432317'] },
      () => {
        testData.authorityHeadings.forEach((heading) => {
          MarcAuthoritiesSearch.searchBy(testData.searchOption, heading);
          MarcAuthorities.selectTitle(heading);
          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.verifyDeleteComplete(heading);
        });

        testData.sourceFileNames.forEach((sourceFileName, index) => {
          MarcAuthority.getRecordsViaAPI(
            true,
            true,
            'text/plain',
            `authoritySourceFile.name="${sourceFileName}"`,
          ).then((body) => {
            const records = body.split('\n');
            createdRecordIDs.forEach((id, idx) => {
              if (idx === index) expect(records.filter((record) => record === id).length).to.equal(1);
              else expect(records.filter((record) => record === id).length).to.equal(0);
            });
          });
        });

        MarcAuthority.getRecordsViaAPI(
          true,
          true,
          null,
          'cql.allRecords=1 NOT authoritySourceFile.name=""',
        ).then((body) => {
          createdRecordIDs.forEach((id, index) => {
            if (index === createdRecordIDs.length - 2) expect(body.authorities.filter((record) => record.id === id).length).to.equal(1);
            else expect(body.authorities.filter((record) => record.id === id).length).to.equal(0);
          });
        });

        MarcAuthority.getRecordsViaAPI(
          true,
          true,
          'text/plain',
          `authoritySourceFile.name="${testData.localSourceName}"`,
        ).then((body) => {
          const records = body.split('\n');
          createdRecordIDs.forEach((id, index) => {
            if (index === createdRecordIDs.length - 1) expect(records.filter((record) => record === id).length).to.equal(1);
            else expect(records.filter((record) => record === id).length).to.equal(0);
          });
        });

        MarcAuthority.getRecordsViaAPI(
          true,
          true,
          'text/plain',
          `(authoritySourceFile.name="${testData.sourceFileNames[0]}") or (authoritySourceFile.name="${testData.sourceFileNames[1]}") or (authoritySourceFile.name="${testData.sourceFileNames[3]}")`,
        ).then((body) => {
          const records = body.split('\n');
          createdRecordIDs.forEach((id, index) => {
            if (index === 0 || index === 1 || index === 3) expect(records.filter((record) => record === id).length).to.equal(1);
            else expect(records.filter((record) => record === id).length).to.equal(0);
          });
        });
      },
    );
  });
});
