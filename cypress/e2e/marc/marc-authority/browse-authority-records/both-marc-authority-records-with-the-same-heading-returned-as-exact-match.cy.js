import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const browseValues = [
        {
          title: 'C442833Africa, East',
          numberOfRecords: 2,
          authRefType: 'Authorized',
        },
        {
          title: 'C442833British East Africa',
          numberOfRecords: 2,
          authRefType: 'Reference',
        },
      ];
      const marcFile = {
        marc: 'marcAuthFileForC442833.mrc',
        fileName: `C442833_testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      };
      const createdRecordsIDs = [];
      let userProperties;

      before('Creating user', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C442833*');

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (createdUserProperties) => {
            userProperties = createdUserProperties;

            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordsIDs.push(record[marcFile.propertyName].id);
              });
            });

            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            }).then(() => {
              MarcAuthorities.switchToBrowse();
              MarcAuthorities.selectSearchOptionInDropdown(
                MARC_AUTHORITY_BROWSE_OPTIONS.GEOGRAPHIC_NAME,
              );
            });
          },
        );
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        createdRecordsIDs.forEach((createdRecordID) => {
          MarcAuthority.deleteViaAPI(createdRecordID);
        });
      });

      it(
        'C442833 Both MARC authority records with the same heading are returned as exact match via browse (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          browseValues.forEach((browseValue) => {
            MarcAuthorities.searchBeats(browseValue.title);
            cy.wait(2000);
            MarcAuthorities.checkBrowseReturnsRecordsAsExactMatch(
              browseValue.title,
              browseValue.numberOfRecords,
              browseValue.authRefType,
            );
          });
        },
      );
    });
  });
});
