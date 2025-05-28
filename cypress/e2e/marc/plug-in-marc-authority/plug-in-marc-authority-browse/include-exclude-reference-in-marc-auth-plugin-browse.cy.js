import {
  DEFAULT_JOB_PROFILE_NAMES,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        headingTypes: ['Corporate Name', 'Conference Name'],
        tags: {
          tag711: '711',
        },
        instanceTitle:
          'Clarinet concerto no. 1, op. 73 [sound recording] / Weber. Andante, K. 315 / Stravinsky. Theme & variations / Rossini.',
        authTitles: ['Mostly Stravinsky Festival'],
        authRows: {
          stravinskyAuth: {
            title: 'Mostly Stravinsky Festival',
            tag: '111',
          },
          stravinskyRef: {
            title: 'Mostly Stravinsky Festival Orchestra',
            tag: '411',
          },
        },
        instanceIDs: [],
        authorityIDs: [],
        authorizedColumnName: 'Authorized/Reference',
        marcFiles: [
          {
            marc: 'marcBibC380434.mrc',
            fileName: `testMarcFileBibC380434.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC380434.mrc',
            fileName: `testMarcFileAuthC380434.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 1,
            propertyName: 'authority',
          },
        ],
      };

      before('Creating user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          // make sure there are no duplicate records in the system
          InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
          testData.authTitles.forEach((query) => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(query);
          });
        });
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
          .then(() => {
            testData.marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  if (
                    marcFile.jobProfileToRun === DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS
                  ) {
                    testData.instanceIDs.push(record[marcFile.propertyName].id);
                  } else {
                    testData.authorityIDs.push(record[marcFile.propertyName].id);
                  }
                });
              });
            });
          })
          .then(() => {
            cy.logout();
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(testData.instanceTitle);
            InventoryInstances.selectInstance();
          });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C380434 Include/exclude Reference records in MARC authority plug-in results list while browsing (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag711);
          MarcAuthorities.clickReset();
          MarcAuthorities.searchBy('Corporate/Conference name', 'Mostly Stravinsky');
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Reference'],
            browsePane: true,
          });

          MarcAuthorities.verifyAllAuthorizedHaveLinks();

          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyValueDoesntExistInColumn(
            testData.authorizedColumnName,
            'Reference',
          );
          MarcAuthorities.verifyAllAuthorizedHaveLinks();

          MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Reference'],
            browsePane: true,
          });

          MarcAuthorities.selectItem(testData.authRows.stravinskyAuth.title, false);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.authRows.stravinskyAuth.tag,
            testData.authRows.stravinskyAuth.title,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.stravinskyAuth.title);
          MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthorities.selectItem(testData.authRows.stravinskyRef.title, false);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.authRows.stravinskyRef.tag,
            testData.authRows.stravinskyRef.title,
          );

          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authRows.stravinskyRef.title);
          MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();
        },
      );
    });
  });
});
