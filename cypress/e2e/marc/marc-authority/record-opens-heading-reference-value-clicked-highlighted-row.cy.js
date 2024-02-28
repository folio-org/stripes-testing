import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {};
    const jobProfileToRun = 'Default - Create SRS MARC Authority';
    const fileName = 'marcAuthFileForC375089.mrc';
    const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
    let createdAuthorityID;

    before('Creating data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(fileName, updatedFileName, jobProfileToRun).then(
            (response) => {
              response.entries.forEach((record) => {
                createdAuthorityID = record.relatedAuthorityInfo.idList[0];
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
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        MarcAuthorities.searchBy('Geographic name', 'C375089 Chidao Jineiya');
        MarcAuthorities.selectFirst();
        MarcAuthorities.checkRecordDetailPageMarkedValue('C375089 Chidao Jineiya');
      },
    );
  });
});
