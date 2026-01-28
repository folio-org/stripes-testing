import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const testData = {
        marcValueShared: 'C410739 Shared DiCaprio',
        marcValueLocal: 'C410739 Local Jackson',
        testId: 'C410739',
        recordTypesAndValues: {
          AUTHORIZED: 'Authorized',
          REFERENCE: 'Reference',
          AUTHREF: 'Auth/Ref',
          referenceValue: 'C410739 Shared DiCaprio 1',
          authRefValue: 'C410739 Shared DiCaprio Titanic',
        },
        authoritySearchOption: 'Keyword',
        authorityBrowseOption: 'Personal name',
        sharedIcon: 'Shared',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcAuthFileForC410739-Shared.mrc',
          fileNameImported: `testMarcFileC410739.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'Central Office',
        },
        {
          marc: 'marcAuthFileForC410739-Local.mrc',
          fileNameImported: `testMarcFileC410739.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'College',
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.resetTenant();
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === 'College') {
                cy.setTenant(Affiliations.College);
              }
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileNameImported,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordIDs.push(record.authority.id);
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdRecordIDs[0]);
        cy.setTenant(Affiliations.College);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C410739 Only Shared "MARC authority" records are found in "MARC authority" app from Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C410739'] },
        () => {
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcValueShared);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authRefValue}`,
          );

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcValueLocal);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${testData.marcValueLocal}". Please check your spelling and filters.`,
          );

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.testId);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authRefValue}`,
          );

          MarcAuthorities.switchToBrowse();
          MarcAuthorities.searchByParameter(
            testData.authorityBrowseOption,
            testData.marcValueShared,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );

          MarcAuthorities.searchByParameter(
            testData.authorityBrowseOption,
            testData.marcValueLocal,
          );
          // eslint-disable-next-line no-irregular-whitespace
          InventorySearchAndFilter.verifySearchResult(`${testData.marcValueLocal} would be here`);

          MarcAuthorities.searchByParameter(testData.authorityBrowseOption, testData.testId);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.marcValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValue}`,
          );
        },
      );
    });
  });
});
