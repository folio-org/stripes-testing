import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {};
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const fileName = 'marcAuthFileForC375089.mrc';
    const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
    let createdAuthorityID;

    before('Creating data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(fileName, updatedFileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityID = record.authority.id;
              });
            },
          );
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        },
      );
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      MarcAuthority.deleteViaAPI(createdAuthorityID);
    });

    it(
      'C375089 View Authority Record: record opens in third pane when "Heading/Reference" value clicked for highlighted row (spitfire) (TaaS)',
      { tags: ['extendedPathBroken', 'spitfire', 'C375089'] },
      () => {
        MarcAuthorities.searchBy('Geographic name', 'C375089 Chidao Jineiya');
        MarcAuthorities.selectFirst();
        MarcAuthorities.checkRecordDetailPageMarkedValue('C375089 Chidao Jineiya');
      },
    );
  });
});
