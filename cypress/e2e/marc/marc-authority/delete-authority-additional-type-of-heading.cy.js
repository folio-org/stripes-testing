import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete, {
  getDeleteModalMessage,
} from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Delete Authority', () => {
      const testData = {
        authorityHeadingPrefix: `AT_C409500_MarcAuthority_${getRandomPostfix()}`,
        tag100: '100',
        tag148: '148',
        tag448: '448',
        tag548: '548',
      };

      const chronoHeadingPrefix = `${testData.authorityHeadingPrefix} chrono`;

      const additionalFieldsHeadings = {
        tag148: `${chronoHeadingPrefix} ${testData.tag148}`,
        tag448: `${chronoHeadingPrefix} ${testData.tag448}`,
        tag548: `${chronoHeadingPrefix} ${testData.tag548}`,
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag148,
          content: `$a ${additionalFieldsHeadings.tag148}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag448,
          content: `$a ${additionalFieldsHeadings.tag448}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag548,
          content: `$a ${additionalFieldsHeadings.tag548}`,
          indicators: ['\\', '\\'],
        },
      ];

      const authorityFieldsSecondRecord = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeadingPrefix} ${testData.tag100}`,
          indicators: ['\\', '\\'],
        },
      ];

      const createdAuthorityIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409500_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${+authData.startWithNumber + 1}`,
            authorityFields,
          ).then((createdRecordId) => {
            createdAuthorityIds.push(createdRecordId);
          });

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFieldsSecondRecord,
          ).then((createdRecordId) => {
            createdAuthorityIds.push(createdRecordId);
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIds.forEach((id) => {
          MarcAuthorities.deleteViaAPI(id, true);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C409500 Delete "MARC Authority" record with additional type of heading (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409500'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeadingPrefix);
          MarcAuthorities.selectTitle(additionalFieldsHeadings.tag548);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(additionalFieldsHeadings.tag548);

          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();
          MarcAuthoritiesDelete.checkDeleteModalMessage(
            getDeleteModalMessage(additionalFieldsHeadings.tag548),
          );
          MarcAuthoritiesDelete.confirmDelete();
          MarcAuthoritiesDelete.checkDelete(additionalFieldsHeadings.tag548);
          MarcAuthorities.verifyRecordFound(additionalFieldsHeadings.tag148, false);
          MarcAuthorities.verifyRecordFound(additionalFieldsHeadings.tag448, false);
          MarcAuthorities.verifyRecordFound(additionalFieldsHeadings.tag548, false);

          MarcAuthorities.searchBeats(chronoHeadingPrefix);
          MarcAuthoritiesDelete.checkEmptySearchResults(chronoHeadingPrefix);
        },
      );
    });
  });
});
