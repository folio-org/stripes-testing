import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      let user;
      const jobProfileToRun = 'Default - Create SRS MARC Authority';
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const createdAuthorityID = [];

      before('Creating data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi('uniform_title.mrc', fileName, jobProfileToRun).then(
          (response) => {
            response.entries.forEach((record) => {
              createdAuthorityID.push(record.relatedAuthorityInfo.idList[0]);
            });
          },
        );

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            user = userProperties;
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityID[0]);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C350767 Browse for MARC Authority record with " & " symbol in the title (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.checkSearchOptions();
          MarcAuthorityBrowse.searchBy('Uniform title', 'Cartoons & Comics');
          MarcAuthorities.checkCellValueIsExists(5, 2, 'Cartoons & Comics');
          MarcAuthorities.checkHeadingReferenceColumnValueIsBold(5);
        },
      );
    });
  });
});
