import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
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
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const createdAuthorityID = [];

      before('Creating data', () => {
        cy.getAdminToken();
        ['C380450', 'C380727', 'C624340', 'Cartoons & Comics'].forEach((record) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(record);
        });
        DataImport.uploadFileViaApi('uniform_title.mrc', fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityID.push(record.authority.id);
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
        { tags: ['extendedPath', 'spitfire', 'C350767'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.checkSearchOptions();
          MarcAuthorityBrowse.searchBy('Uniform title', 'Cartoons & Comics');
          MarcAuthorities.checkCellValueIsExists(0, 2, 'Cartoons & Comics');
          MarcAuthorities.checkHeadingReferenceColumnValueIsBold(0);
        },
      );
    });
  });
});
