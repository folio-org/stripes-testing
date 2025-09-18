import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  authorityIDs: [],
  childrenOption: "Children's subject heading",
  genreOption: 'Genre',
  subjectOption: 'Subject',
  headingsC466093: [
    "children's subjectauto c466093 heading case testauto",
    "CHILDREN'S SUBJECTAUTO C466093 HEADING CASE TESTAUTO",
  ],
  headingsC466092: ['genreauto case c466092 testauto', 'GENREAUTO CASE C466092 TESTAUTO'],
  headingsC466091: ['subjectauto case c466091 testauto', 'SUBJECTAUTO CASE C466091 TESTAUTO'],

  marcFile: {
    marc: 'marcAuthFileHeadingsCaseInsensitive.mrc',
    fileName: `testMarcFileHeadingsCaseIns.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    numberOfRecords: 6,
    propertyName: 'authority',
  },

  headingPrefixes: [
    "children's subjectauto c466093",
    'genreauto case c466092',
    'subjectauto case c466091',
  ],
};

describe('MARC', () => {
  describe('MARC Authority', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      testData.headingPrefixes.forEach((headingPrefix) => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(headingPrefix);
      });

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.getUserToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            testData.authorityIDs.push(record[testData.marcFile.propertyName].id);
          });
        });
      });
    });

    beforeEach('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
        authRefresh: true,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.authorityIDs.forEach((id) => {
        MarcAuthorities.deleteViaAPI(id);
      });
    });

    it(
      'C466093 Search by "Children\'s subject heading" field is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466093'] },
      () => {
        testData.headingsC466093.forEach((query) => {
          MarcAuthorities.searchBeats(query);
          MarcAuthorities.checkResultList(testData.headingsC466093);
          MarcAuthorities.clickResetAndCheck();
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });
        testData.headingsC466093.forEach((query) => {
          MarcAuthorities.searchByParameter(testData.childrenOption, query);
          MarcAuthorities.checkResultList(testData.headingsC466093);
          MarcAuthorities.clickResetAndCheck();
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });
      },
    );

    it(
      'C466092 Search/Browse by "Genre" field is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466092'] },
      () => {
        testData.headingsC466092.forEach((query) => {
          MarcAuthorities.searchBeats(query);
          MarcAuthorities.checkResultList(testData.headingsC466092);
          MarcAuthorities.clickResetAndCheck();
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });
        testData.headingsC466092.forEach((query) => {
          MarcAuthorities.searchByParameter(testData.genreOption, query);
          MarcAuthorities.checkResultList(testData.headingsC466092);
          MarcAuthorities.clickResetAndCheck();
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });

        MarcAuthorities.switchToBrowse();
        MarcAuthorities.checkDefaultBrowseOptions(
          testData.headingsC466092[testData.headingsC466092.length - 1],
        );
        MarcAuthorities.checkRecordsResultListIsAbsent();
        testData.headingsC466092.forEach((query) => {
          MarcAuthorities.searchByParameter(testData.genreOption, query);
          MarcAuthorities.checkResultList(testData.headingsC466092);
          MarcAuthorities.clickReset();
          MarcAuthorities.checkDefaultBrowseOptions(query);
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });
      },
    );

    it(
      'C466091 Search/Browse by "Subject" field is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466091'] },
      () => {
        testData.headingsC466091.forEach((query) => {
          MarcAuthorities.searchBeats(query);
          MarcAuthorities.checkResultList(testData.headingsC466091);
          MarcAuthorities.clickResetAndCheck();
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });
        testData.headingsC466091.forEach((query) => {
          MarcAuthorities.searchByParameter(testData.subjectOption, query);
          MarcAuthorities.checkResultList(testData.headingsC466091);
          MarcAuthorities.clickResetAndCheck();
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });

        MarcAuthorities.switchToBrowse();
        MarcAuthorities.checkDefaultBrowseOptions(
          testData.headingsC466091[testData.headingsC466091.length - 1],
        );
        MarcAuthorities.checkRecordsResultListIsAbsent();
        testData.headingsC466091.forEach((query) => {
          MarcAuthorities.searchByParameter(testData.subjectOption, query);
          MarcAuthorities.checkResultList(testData.headingsC466091);
          MarcAuthorities.clickReset();
          MarcAuthorities.checkDefaultBrowseOptions(query);
          MarcAuthorities.checkRecordsResultListIsAbsent();
        });
      },
    );
  });
});
