import Permissions from '../../../support/dictionary/permissions';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

const randomPostfix = getRandomPostfix();
const authorityUUIDsFileName = `AT_C409503_authorityUUIDs_${randomPostfix}.csv`;
const authorityHeadingPrefix = `AT_C409503_MarcAuthority_${randomPostfix}`;
const subfieldTPrefix = `subfieldT_${randomPostfix}`;
const defaultAuthorityExportProfile = 'Default authority';
const calloutMessage =
  "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.";
const authData = {
  prefix: getRandomLetters(15),
  startWithNumber: 1,
};
const authorityRecordsData = [
  { mainField: '100', withSubfieldT: false },
  { mainField: '100', withSubfieldT: true },
  { mainField: '110', withSubfieldT: false },
  { mainField: '110', withSubfieldT: true },
  { mainField: '111', withSubfieldT: false },
  { mainField: '147', withSubfieldT: false },
  { mainField: '148', withSubfieldT: false },
  { mainField: '150', withSubfieldT: false },
  { mainField: '151', withSubfieldT: false },
  { mainField: '155', withSubfieldT: false },
  { mainField: '162', withSubfieldT: false },
  { mainField: '180', withSubfieldT: false },
  { mainField: '181', withSubfieldT: false },
  { mainField: '182', withSubfieldT: false },
  { mainField: '185', withSubfieldT: false },
];
const getSubfieldValue = (recordData, index, isSubfieldT = false) => {
  if (isSubfieldT && recordData.withSubfieldT) return `${subfieldTPrefix}_${index}`;
  else return `${authorityHeadingPrefix}_Record_${index}`;
};
const getAuthorityHeading = (recordData, index) => `${getSubfieldValue(recordData, index)}${recordData.withSubfieldT ? ` ${getSubfieldValue(recordData, index, true)}` : ''}`;
const getAuthorityFields = (recordData, index) => [
  {
    tag: recordData.mainField,
    content: `$${recordData.mainField.includes('18') ? 'x' : 'a'} ${getSubfieldValue(recordData, index)}${recordData.withSubfieldT ? ` $t ${getSubfieldValue(recordData, index, true)}` : ''}`,
    indicators: ['1', '\\'],
  },
  {
    tag: `4${recordData.mainField.substring(1)}`,
    content: `$${recordData.mainField.includes('18') ? 'x' : 'a'} ${getSubfieldValue(recordData, index)}_4XX${recordData.withSubfieldT ? ` $t ${getSubfieldValue(recordData, index, true)}` : ''}`,
    indicators: ['1', '\\'],
  },
  {
    tag: `5${recordData.mainField.substring(1)}`,
    content: `$${recordData.mainField.includes('18') ? 'x' : 'a'} ${getSubfieldValue(recordData, index)}_5XX${recordData.withSubfieldT ? ` $t ${getSubfieldValue(recordData, index, true)}` : ''}`,
    indicators: ['1', '\\'],
  },
];

const assertionsOnMarcFileContent = [];
const authorityIds = [];
let user;
let exportedFileName;

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409503');

      cy.createTempUser([
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          authorityRecordsData.forEach((recordData, index) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startWithNumber + index}`,
              getAuthorityFields(recordData, index),
            ).then((createdRecordId) => {
              authorityIds.push(createdRecordId);
            });
          });
        })
        .then(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      authorityIds.forEach((id) => {
        MarcAuthorities.deleteViaAPI(id, true);
      });
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C409503 Export "MARC Authority" records with additional types of headings (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C409503'] },
      () => {
        MarcAuthorities.searchBeats(authorityHeadingPrefix);
        authorityRecordsData.forEach((recordData, index) => {
          MarcAuthorities.verifyRecordFound(getAuthorityHeading(recordData, index));
        });
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority(
          `${authorityRecordsData.length} records selected`,
        );
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority(
          `${authorityRecordsData.length * 3} records found`,
        );
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(calloutMessage);
        ExportFileHelper.downloadCSVFile(authorityUUIDsFileName, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();

        ExportFileHelper.uploadFile(authorityUUIDsFileName);

        ExportFileHelper.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          defaultAuthorityExportProfile,
          'Authorities',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${authorityUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            authorityIds.length,
            jobId,
            user.username,
            defaultAuthorityExportProfile,
          );

          DataExportLogs.clickButtonWithText(exportedFileName);

          authorityRecordsData.forEach((recordData, index) => {
            assertionsOnMarcFileContent.push({
              uuid: authorityIds[index],
              assertions: [
                (record) => expect(record.get(recordData.mainField)[0].subf[0][1]).to.eq(
                  getSubfieldValue(recordData, index),
                ),
                (record) => expect(record.get(`4${recordData.mainField.substring(1)}`)[0].subf[0][1]).to.eq(
                  `${getSubfieldValue(recordData, index)}_4XX`,
                ),
                (record) => expect(record.get(`5${recordData.mainField.substring(1)}`)[0].subf[0][1]).to.eq(
                  `${getSubfieldValue(recordData, index)}_5XX`,
                ),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(authorityIds[index]),
              ],
            });
          });

          parseMrcFileContentAndVerify(
            exportedFileName,
            assertionsOnMarcFileContent,
            authorityIds.length,
            false,
          );
        });
      },
    );
  });
});
