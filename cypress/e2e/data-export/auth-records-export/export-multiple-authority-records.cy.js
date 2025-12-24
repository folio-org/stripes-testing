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

const randomPostfix = getRandomPostfix();
const authorityUUIDsFileName = `AT_C350971_authorityUUIDs_${randomPostfix}.csv`;
const authorityHeadingPrefix = `AT_C350971_MarcAuthority_${randomPostfix}`;
const defaultAuthorityExportProfile = 'Default authority';
const authData = {
  prefix: getRandomLetters(15),
  startWithNumber: 1,
};
const subfieldValuesA = [
  `${authorityHeadingPrefix} Record 1`,
  `${authorityHeadingPrefix} Record 1 - 400 field 1`,
  `${authorityHeadingPrefix} Record 1 - 400 field 2`,
  `${authorityHeadingPrefix} Record 1 - 500 field`,
];
const subfieldValuesB = [
  `${authorityHeadingPrefix} Record 2`,
  `${authorityHeadingPrefix} Record 2 - 430 field 1`,
  `${authorityHeadingPrefix} Record 2 - 430 field 2`,
];
const authorityFields = [
  [
    {
      tag: '100',
      content: `$a ${subfieldValuesA[0]}`,
      indicators: ['1', '\\'],
    },
    {
      tag: '400',
      content: `$a ${subfieldValuesA[1]}`,
      indicators: ['1', '\\'],
    },
    {
      tag: '400',
      content: `$a ${subfieldValuesA[2]}`,
      indicators: ['1', '\\'],
    },
    {
      tag: '500',
      content: `$a ${subfieldValuesA[3]}`,
      indicators: ['1', '\\'],
    },
  ],
  [
    {
      tag: '130',
      content: `$a ${subfieldValuesB[0]}`,
      indicators: ['\\', '0'],
    },
    {
      tag: '430',
      content: `$a ${subfieldValuesB[1]}`,
      indicators: ['\\', '0'],
    },
    {
      tag: '430',
      content: `$a ${subfieldValuesB[2]}`,
      indicators: ['\\', '0'],
    },
  ],
];

let user;
let exportedFileName;
const authorityIds = [];

describe('Data Export', () => {
  describe('Authority records export', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C350971');

      cy.createTempUser([
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          authorityFields.forEach((fieldSet, index) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startWithNumber + index}`,
              fieldSet,
            ).then((createdRecordId) => {
              authorityIds.push(createdRecordId);
            });
          });
        })
        .then(() => {
          FileManager.createFile(
            `cypress/fixtures/${authorityUUIDsFileName}`,
            authorityIds.join('\n'),
          );

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
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
      'C350971 Export of multiple "MARC Authority" records (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350971'] },
      () => {
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

          const assertionsOnMarcFileContent = [
            {
              uuid: authorityIds[0],
              assertions: [
                (record) => expect(record.get('100')[0].subf[0][1]).to.eq(subfieldValuesA[0]),
                (record) => expect(record.get('400')[0].subf[0][1]).to.eq(subfieldValuesA[1]),
                (record) => expect(record.get('400')[1].subf[0][1]).to.eq(subfieldValuesA[2]),
                (record) => expect(record.get('500')[0].subf[0][1]).to.eq(subfieldValuesA[3]),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(authorityIds[0]),
              ],
            },
            {
              uuid: authorityIds[1],
              assertions: [
                (record) => expect(record.get('130')[0].subf[0][1]).to.eq(subfieldValuesB[0]),
                (record) => expect(record.get('430')[0].subf[0][1]).to.eq(subfieldValuesB[1]),
                (record) => expect(record.get('430')[1].subf[0][1]).to.eq(subfieldValuesB[2]),
                (record) => expect(record.get('999')[0].subf[1][1]).to.eq(authorityIds[1]),
              ],
            },
          ];

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
