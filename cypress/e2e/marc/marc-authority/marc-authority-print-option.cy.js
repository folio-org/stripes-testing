import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      authData: {
        prefix: '',
        startWithNumber: `380635${randomNDigitNumber(15)}`,
      },
      authorityHeading: `AT_C380635_MarcAuthority_${randomPostfix}`,
      expectedActions: ['Edit', 'Export (MARC)', 'Print', 'Delete'],
    };
    let createdRecordId;

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380635_');

      MarcAuthorities.createMarcAuthorityViaAPI(
        testData.authData.prefix,
        testData.authData.startWithNumber,
        [
          {
            tag: '100',
            content: `$a ${testData.authorityHeading}`,
            indicators: ['1', '\\'],
          },
        ],
      ).then((recordId) => {
        createdRecordId = recordId;

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      MarcAuthority.deleteViaAPI(createdRecordId, true);
      Users.deleteViaApi(testData.userProperties.userId);
    });
    it(
      'C380635 "Print" option is located below "Export (MARC)" option in "Actions" menu for "MARC authority" record (promin) (TaaS)',
      { tags: ['extendedPath', 'promin', 'C380635'] },
      () => {
        MarcAuthorities.searchBeats(testData.authorityHeading);
        MarcAuthorities.selectFirstRecord();
        MarcAuthority.checkActionDropdownContent(testData.expectedActions);
      },
    );
  });
});
