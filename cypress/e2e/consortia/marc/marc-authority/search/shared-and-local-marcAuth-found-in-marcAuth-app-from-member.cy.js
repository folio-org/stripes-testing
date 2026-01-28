import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const testData = {
        marcValueShared: 'C410744 Shared DiCaprio',
        marcValueLocalM1: 'C410744 Local Member',
        marcValueLocalM2: 'C410744 Local Member 2',
        testId: 'C410744',
        recordTypesAndValues: {
          AUTHORIZED: 'Authorized',
          REFERENCE: 'Reference',
          AUTHREF: 'Auth/Ref',
          authorizedSharedValue: 'C410744 Shared DiCaprio, Leonardo',
          authorizedValueM1: 'C410744 Local Member 1 Jackson, Samuel L.',
          referenceValueShared: 'C410744 Shared Di Caprio, Leonardo (actor)',
          authRefValueShared: 'C410744 Shared Di Caprio, Leonardo (Titanic)',
          referenceValueM1: 'C410744 Local Member 1 Jackson, Sam, 1948-',
          authRefValueM1: 'C410744 Local Member 1 Jackson, Samuel Leroy 12-21-1948',
        },
        authoritySearchOption: 'Keyword',
        authorityBrowseOption: 'Personal name',
        sharedIcon: 'Shared',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcAuthFileForC410744-Shared.mrc',
          fileNameImported: `testMarcFileC4107444.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'Central Office',
        },
        {
          marc: 'marcAuthFileForC410744-Local-M1.mrc',
          fileNameImported: `testMarcFileC410744.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'University',
        },
        {
          marc: 'marcAuthFileForC410744-Local-M2.mrc',
          fileNameImported: `testMarcFileC410744.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          tenant: 'College',
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            marcFiles.forEach((marcFile) => {
              if (marcFile.tenant === 'University') {
                cy.setTenant(Affiliations.University);
              } else if (marcFile.tenant === 'College') {
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
            }).then(() => {
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );
              MarcAuthorities.waitLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdRecordIDs[0]);
        cy.setTenant(Affiliations.University);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        cy.setTenant(Affiliations.College);
        MarcAuthority.deleteViaAPI(createdRecordIDs[2]);
      });

      it(
        'C410744 Shared and Local (for current tenant) "MARC authority" records are found in "MARC authority" app from Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C410744'] },
        () => {
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcValueShared);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authorizedSharedValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authRefValueShared}`,
          );

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcValueLocalM1);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            testData.recordTypesAndValues.authorizedValueM1,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            testData.recordTypesAndValues.referenceValueM1,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            testData.recordTypesAndValues.authRefValueM1,
          );

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.marcValueLocalM2);
          MarcAuthorities.checkNoResultsMessage(
            `No results found for "${testData.marcValueLocalM2}". Please check your spelling and filters.`,
          );

          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.testId);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authorizedSharedValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authRefValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            testData.recordTypesAndValues.authorizedValueM1,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            testData.recordTypesAndValues.referenceValueM1,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHREF,
            testData.recordTypesAndValues.authRefValueM1,
          );

          MarcAuthorities.switchToBrowse();
          MarcAuthorities.searchByParameter(
            testData.authorityBrowseOption,
            testData.marcValueShared,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authorizedSharedValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValueShared}`,
          );

          MarcAuthorities.searchByParameter(testData.authorityBrowseOption, testData.testId);
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            `${testData.sharedIcon}${testData.recordTypesAndValues.authorizedSharedValue}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            `${testData.sharedIcon}${testData.recordTypesAndValues.referenceValueShared}`,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.AUTHORIZED,
            testData.recordTypesAndValues.authorizedValueM1,
          );
          MarcAuthorities.checkAfterSearch(
            testData.recordTypesAndValues.REFERENCE,
            testData.recordTypesAndValues.referenceValueM1,
          );
        },
      );
    });
  });
});
